let bleno = require('bleno'),
	os = require('os'),
	onDeath = require('death'),
	constants = require('../constants'),
	settings = require('../settings'),
	events = require('../lib/events'),
	utils = require('../lib/utils'),
	rscService = settings.broadcastRSC && new (require('./rsc/service'))(),
	rscCalculator = require('./rsc/calculator'),
	treadmillService = settings.broadcastFTMS && new (require('./treadmill/service'))(),
	treadmillCalculator = require('./treadmill/calculator');

/*
 State.
 */
let updateFPS = 5,
	lastTrackedAt = null,
	idle = true,
	idleSecondsCount = 0,
	current = {
		clients: [],
		time: 0,
		hr: 0,
		miles: 0,
		kilometers: 0,
		mph: 0,
		kph: 0,
		incline: 0,
		cadence: 0
	},
	ramps = {
		hr: 0,
		mph: 0,
		kph: 0,
		incline: 0,
		cadence: 0
	},
	services = [
		rscService,
		treadmillService
	].filter(s => s),
	serviceUUIDs = services.map(s => s.uuid),
	updateID;


/*
 Public API.
 */
exports.current = current;
exports.start = start;

/*
 Implementation.
 */

function start() {
	bleno.on('stateChange', onStateChanged);
	bleno.on('advertisingStart', onAdvertisingStarted);
	bleno.on('accept', onAccepted);
	bleno.on('disconnect', onDisconnected);
	events.on('changeReceived', onChangeReceived);
	updateID = setInterval(emitUpdates, constants.UPDATE_INTERVAL_MILLISECONDS / updateFPS);
	onDeath(cleanUp);
	console.log('Bluetooth: Server started.');
}

function onStateChanged(state) {
	if (state === 'poweredOn') {
		current.poweredOn = true;
		console.log('Bluetooth: Powered On.');
		bleno.startAdvertising(constants.NAME, serviceUUIDs);
	}
	else {
		current.poweredOn = false;
		console.log('Bluetooth: Powered Off.');
		bleno.stopAdvertising();
	}
}

function onAccepted(clientAddress) {
	if (current.clients.indexOf(clientAddress) === -1) {
		current.clients.push(clientAddress);
	}
}

function onDisconnected(clientAddress) {
	if (current.clients.indexOf(clientAddress) >= 0) {
		current.clients.splice(current.clients.indexOf(clientAddress), 1);
	}
}

function onAdvertisingStarted(error) {
	if (error) {
		console.error(error);
		return;
	}
	bleno.setServices(services);
}

function onChangeReceived(data) {
	if (data.hr !== undefined) {
		current.hr = data.hr;
	}
	if (data.mph !== undefined) {
		current.mph = data.mph;
		current.kph = data.mph * 1.609344;
	}
	if (data.kph !== undefined) {
		current.mph = data.kph / 1.609344;
		current.kph = data.kph;
	}
	if (data.cadence !== undefined) {
		current.cadence = data.cadence;
	}
	if (data.incline !== undefined) {
		current.incline = data.incline;
	}
}

function emitUpdates() {
	calculateTimeAndDistance();
	rampCurrentValue('mph');
	let kph = rampCurrentValue('kph'),
		hr = rampCurrentValue('hr'),
		cadence = rampCurrentValue('cadence'),
		incline = rampCurrentValue('incline');
	if (rscService && rscService.measurement.updateValueCallback) {
		rscService.measurement.updateValueCallback(rscCalculator.calculateBuffer({
			kph: kph,
			cadence: cadence
		}));
	}
	if (treadmillService && treadmillService.measurement.updateValueCallback) {
		treadmillService.measurement.updateValueCallback(treadmillCalculator.calculateBuffer({
			kph: kph,
			hr: hr,
			incline: incline
		}));
	}
}

function calculateTimeAndDistance() {
	if (lastTrackedAt && current.mph > 0) {
		if (idle) {
			idle = false;
			idleSecondsCount = 0;
			current.miles = 0;
			current.kilometers = 0;
			current.time = 0;
		}
		let elapsedSeconds = utils.convertElapsedToSeconds(process.hrtime(lastTrackedAt));
		current.time += elapsedSeconds;
		current.miles += current.mph / 3600 * elapsedSeconds;
		current.kilometers = current.miles * 1.609344;
	}
	else if (!idle && current.mph <= 0) {
		idleSecondsCount += 1;
		if (idleSecondsCount >= 60 * 60) { // one hour
			idle = true;
			idleSecondsCount = 0;
		}
	}
	lastTrackedAt = process.hrtime();
}


function rampCurrentValue(key) {
	let currentValue = current[key],
		rampedValue = ramps[key],
		delta = currentValue - rampedValue,
		step = 0.2 / updateFPS;
	// Are we within one step of the new value?
	if (Math.abs(delta) <= step) {
		ramps[key] = current[key];
	}
	else {
		ramps[key] += delta * 0.2;
	}
	return ramps[key];
}

function cleanUp() {
	clearInterval(updateID);
	if (os.platform() !== 'darwin') {
		// Bleno doesn't support "disconnect" on OS X, for some reason.
		try {
			bleno.disconnect();
		}
		catch (err) {
			console.error(err);
		}
	}
}

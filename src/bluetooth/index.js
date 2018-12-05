let bleno = require('bleno'),
	os = require('os'),
	onDeath = require('death'),
	constants = require('../constants'),
	events = require('../lib/events'),
	rscService = new (require('./rsc/service'))(),
	rscCalculator = require('./rsc/calculator'),
	treadmillService = new (require('./treadmill/service'))(),
	treadmillCalculator = require('./treadmill/calculator');

/*
 State.
 */
let updateFPS = 5,
	current = {
		mph: 0,
		incline: 0,
		cadence: 0
	},
	ramps = {
		mph: 0,
		incline: 0,
		cadence: 0
	},
	services = [
		rscService,
		treadmillService
	],
	serviceUUIDs = services.map(s => s.uuid),
	updateID;

/*
 Public API.
 */
exports.start = start;

/*
 Implementation.
 */

function start() {
	bleno.on('stateChange', onStateChanged);
	bleno.on('advertisingStart', onAdvertisingStarted);
	events.on('changeReceived', onChangeReceived);
	updateID = setInterval(emitUpdates, constants.UPDATE_INTERVAL_MILLISECONDS / updateFPS);
	onDeath(cleanUp);
	console.log('Bluetooth: Server started.');
}

function onStateChanged(state) {
	if (state === 'poweredOn') {
		console.log('Bluetooth: Powered On.');
		bleno.startAdvertising(constants.NAME, serviceUUIDs);
	}
	else {
		console.log('Bluetooth: Powered Off.');
		bleno.stopAdvertising();
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
	if (data.speed !== undefined) {
		current.mph = data.speed;
	}
	if (data.cadence !== undefined) {
		current.cadence = data.cadence;
	}
	if (data.incline !== undefined) {
		current.incline = data.incline;
	}
}

function emitUpdates() {
	let mph = rampCurrentValue('mph'),
		cadence = rampCurrentValue('cadence'),
		incline = rampCurrentValue('incline');
	if (rscService.measurement.updateValueCallback) {
		rscService.measurement.updateValueCallback(rscCalculator.calculateBuffer({
			mph,
			cadence
		}));
	}
	if (treadmillService.measurement.updateValueCallback) {
		treadmillService.measurement.updateValueCallback(treadmillCalculator.calculateBuffer({
			mph,
			incline
		}));
	}
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

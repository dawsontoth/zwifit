let async = require('async'),
	settings = require('./settings'),
	events = require('./lib/events');

/*
 Global variables
 */
let ensureConnectedID,
	current = {},
	disconnectedHook = undefined;

/*
 Simulated values
 */
let speed = 30,
	resistance = 13,
	power = 300,
	cadence = 95;

/*
 Public API
 */
exports.connect = connect;
exports.disconnect = () => {};
exports.current = current;

/*
 Implementation
 */
function connect(callOnDisconnect) {
	disconnectedHook = callOnDisconnect;
	events.on('controlRequested', controlRequested);
	ensureConnectedID = setInterval(onInterval, 500);
	setTimeout(onInterval, 1);
	current.connected = true; // Simulate connected
}

/*
 Function called when control is requested from the user or zwift
 */
function controlRequested(message) {
	if (message.mph !== undefined) {
		speed = String(message.mph);
	}
	if (message.kph !== undefined) {
		speed = String(message.kph);
	}
	if (message.incline !== undefined) {
		resistance = String(message.incline);
	}	
}

/*
 Called every notification interval to update simulated values
*/
function onInterval() {
	
	let changes = {},
		s = speed,
		speedStoredIn = settings.metric ? 'KPH' : 'MPH';

	// Apply speed offsets from the settings
	if (settings.speedOffset) {
		s += settings.speedOffset;
	}
	if (settings.speedMultiplier) {
		s *= settings.speedMultiplier;
	}

	// Simulation values
	changes[speedStoredIn.toLowerCase()] = s;
	changes['incline'] = resistance;
	changes['cadence'] = cadence;
	changes['power'] = power;
	
	// Notify that changes should be transmitted to zwift
	events.fire('changeReceived', changes);
}

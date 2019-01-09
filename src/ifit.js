let WebSocketClient = require('websocket').client,
	onDeath = require('death'),
	settings = require('./settings'),
	events = require('./lib/events');

/*
 State.
 */
let debug = false,
	current = {},
	client,
	lastConnection,
	ensureConnectedID;

/*
 Public API.
 */
exports.connect = connect;
exports.current = current;

/*
 Implementation.
 */

function connect() {
	client = new WebSocketClient();
	client.on('connectFailed', onConnectFailed);
	client.on('connect', onConnected);
	events.on('controlRequested', controlRequested);
	ensureConnectedID = setInterval(ensureConnected, 10 * 1000);
	ensureConnected();
	onDeath(cleanUp);
}

function ensureConnected() {
	if (!current.connected && settings.ip) {
		console.log('iFit: Connecting...');
		client.connect(`ws://${settings.ip}/control`);
	}
}

function onConnectFailed(error) {
	current.connected = false;
	console.log('iFit: Connect Error: ' + error.toString());
}

function onConnected(connection) {
	console.log('iFit: Connected!');
	current.connected = true;
	lastConnection = connection;
	connection.on('message', onMessage);
	connection.on('error', onError);
	connection.on('close', onClose);
}

function controlRequested(message) {
	if (!lastConnection) {
		return;
	}
	let control = {
		type: 'set',
		values: {}
	};
	if (message.mph !== undefined) {
		control.values['MPH'] = String(message.mph);
	}
	if (message.kph !== undefined) {
		control.values['KPH'] = String(message.kph);
	}
	if (message.incline !== undefined) {
		control.values['Incline'] = String(message.incline);
	}
	if (Object.keys(control.values).length > 0) {
		lastConnection.sendUTF(JSON.stringify(control));
	}

}

function onMessage(message) {
	let parsed = safeJSONParse(message.utf8Data || message.data);
	if (debug) {
		console.log('iFit:', parsed);
	}
	// TODO: Also parse out the distance traveled so we don't have to calculate it?
	if (parsed.values) {
		parsed = parsed.values;
	}
	for (let parsedKey in parsed) {
		if (parsed.hasOwnProperty(parsedKey)) {
			current[parsedKey] = parsed[parsedKey];
		}
	}
	let changes = {},
		speedStoredIn = settings.metric ? 'KPH' : 'MPH';
	if (parsed[speedStoredIn] !== undefined) {
		let speed = safeParseFloat(parsed[speedStoredIn]);
		if (speed < 0.1) {
			speed = 0;
		}
		else {
			if (settings.speedOffset) {
				speed += settings.speedOffset;
			}
			if (settings.speedMultiplier) {
				speed *= settings.speedMultiplier;
			}
		}
		changes[speedStoredIn.toLowerCase()] = speed;
	}
	if (parsed['Incline'] !== undefined) {
		changes['incline'] = safeParseFloat(parsed['Incline']);
	}
	if (parsed['Chest Pulse'] !== undefined) {
		changes['hr'] = safeParseFloat(parsed['Chest Pulse']);
	}
	if (Object.keys(changes).length) {
		events.fire('changeReceived', changes);
	}
}

function safeJSONParse(string) {
	try {
		return JSON.parse(string);
	}
	catch (err) {
		return null;
	}
}

function safeParseFloat(val) {
	try {
		return parseFloat(val);
	}
	catch (err) {
		return 0;
	}
}

function onError(error) {
	console.error('Connection Error: ' + error.toString());
}

function onClose() {
	current.connected = false;
	console.log('iFit Connection Closed');
}

function cleanUp() {
	clearInterval(ensureConnectedID);
	try {
		if (client) {
			client.abort();
			client = null;
		}
	}
	catch (err) {
		console.error(err);
	}
}

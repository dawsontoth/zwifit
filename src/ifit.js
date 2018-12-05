let WebSocketClient = require('websocket').client,
	onDeath = require('death'),
	settings = require('./settings'),
	events = require('./lib/events');

/*
 State.
 */
let connected = false,
	debug = false,
	client,
	ensureConnectedID;

/*
 Public API.
 */
exports.connect = connect;

/*
 Implementation.
 */

function connect() {
	client = new WebSocketClient();
	client.on('connectFailed', onConnectFailed);
	client.on('connect', onConnected);
	ensureConnectedID = setInterval(ensureConnected, 5000);
	ensureConnected();
	onDeath(cleanUp);
}

function ensureConnected() {
	if (!connected) {
		console.log('iFit: Connecting...');
		client.connect(`ws://${settings.ip}/control`);
	}
}

function onConnectFailed(error) {
	connected = false;
	console.log('iFit: Connect Error: ' + error.toString());
}

function onConnected(connection) {
	console.log('iFit: Connected!');
	connected = true;
	connection.on('message', onMessage);
	connection.on('error', onError);
	connection.on('close', onClose);
	// TODO: Once we can read incline (and speed) from... you know who... we can control the treadmill!
	// connection.sendUTF(JSON.stringify({ 'Actual Incline': 3 }));
	// connection.sendUTF(JSON.stringify({ 'MPH': 6 }));
}

function onMessage(message) {
	let parsed = safeParse(message.utf8Data || message.data);
	if (debug) {
		console.log('iFit: Message received!');
		console.log(parsed);
	}
	if (parsed.values) {
		parsed = parsed.values;
	}
	if (parsed['MPH'] !== undefined) {
		events.fire('changeReceived', {
			speed: parsed['MPH'] < 0.1 ? 0 : parsed['MPH']
		});
	}
	if (parsed['Actual Incline'] !== undefined) {
		events.fire('changeReceived', {
			incline: parsed['Actual Incline']
		});
	}
}

function onError(error) {
	console.error('Connection Error: ' + error.toString());
}

function onClose() {
	connected = false;
	console.log('iFit Connection Closed');
}

function safeParse(string) {
	try {
		return JSON.parse(string);
	}
	catch (err) {
		return null;
	}
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

let WebSocketClient = require('websocket').client,
	find = require('local-devices'),
	async = require('async'),
	onDeath = require('death'),
	settings = require('./settings'),
	events = require('./lib/events');

/*
 State.
 */
let debug = false,
	scanning = false,
	current = {},
	client,
	lastConnection,
	ensureConnectedID;
let disconnectedHook = undefined;

/*
 Public API.
 */
exports.connect = connect;
exports.disconnect = () => {};
exports.current = current;

/*
 Implementation.
 */

function connect(callOnDisconnect) {
	disconnectedHook = callOnDisconnect;
	client = new WebSocketClient();
	client.on('connectFailed', onConnectFailed);
	client.on('connect', onConnected);
	events.on('controlRequested', controlRequested);
	ensureConnectedID = setInterval(ensureConnected, 10 * 1000);
	setTimeout(ensureConnected, 1);
	onDeath(cleanUp);
}

function ensureConnected() {
	if (current.connected) {
		return;
	}
	if (settings.ip) {
		console.log('iFit: Connecting...');
		client.connect(`ws://${settings.ip}/control`);
	}
	else if (!scanning) {
		scanning = true;
		console.log('iFit: Scanning your network...');
		find()
			.then(devices => {
				devices.unshift({ ip: '127.0.0.1' });
				devices.unshift({ ip: '127.0.0.1:8080' });
				if (settings.lastIP) {
					devices.unshift({ ip: settings.lastIP });
					settings.lastIP = null;
				}
				async.eachLimit(
					devices,
					100,
					async device => {
						if (await test(device.ip)) {
							// No error thrown? Then we connected!
							console.log('IFit: Found ' + device.ip);
							settings.lastIP = device.ip;
							client.connect(`ws://${settings.lastIP}/control`);
							throw new Error('Stop trying to connect to others');
						}
					},
					() => {
						if (!settings.lastIP) {
							console.log('iFit: Nothing found. Will try again...');
						}
						return scanning = false;
					});
			})
			.catch(err => {
				console.error('iFit: ' + err);
				scanning = false;
			});
	}
}

function onConnectFailed(error) {
	let runHook = undefined;
	if (current.connected) {
		runHook = disconnectedHook;
	}

	current.connected = false;
	console.error('iFit: Connect Error: ' + error.toString());

	if (runHook) {
		runHook();
	}
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
	let parsed = safeJSONParse(message ? message.utf8Data || message.data : null);
	if (debug) {
		console.log('iFit:', parsed);
	}
	if (!parsed) {
		return;
	}
	// TODO: Parse out the distance traveled so we don't have to calculate it?
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
	if (parsed['Cadence'] !== undefined) {
		changes['cadence'] = safeParseFloat(parsed['Cadence']);
	}
	if (Object.keys(changes).length) {
		events.fire('changeReceived', changes);
	}
}

function safeJSONParse(string) {
	if (!string) {
		return null;
	}
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
	console.error('iFit: Connection Error: ' + error.toString());
}

function onClose() {
	let runHook = undefined;
	if (current.connected) {
		runHook = disconnectedHook;
	}

	current.connected = false;
	console.log('iFit: Connection Closed');

	if (runHook) {
		runHook();
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
		console.error('iFit: ' + err);
	}
}

function test(ip) {
	return new Promise(resolve => {
		let client = new WebSocketClient(),
			resolved = false,
			timeoutID,
			finished = succeeded => {
				if (timeoutID) {
					clearTimeout(timeoutID);
					timeoutID = null;
				}
				if (!resolved) {
					if (client) {
						client.abort();
						client = null;
					}
					resolved = true;
					if (!succeeded) {
						resolve(false);
					}
					else {
						resolve(true);
					}
				}
			};
		client.on('connectFailed', failed => finished(false));
		client.on('connect', connection => {
			if (!scanning) {
				if (client) {
					client.abort();
					client = null;
				}
				return;
			}
			connection.on('error', err => finished(false));
			connection.on('close', closed => finished(false));
			connection.on('message', message => {
				let parsed = safeJSONParse(message ? message.utf8Data || message.data : null);
				if (parsed.values) {
					parsed = parsed.values;
				}
				finished(parsed['MPH'] !== undefined || parsed['KPH'] !== undefined);
			});
		});
		client.connect(`ws://${ip}/control`);
		timeoutID = setTimeout(() => finished(false), 5000);
	});
}

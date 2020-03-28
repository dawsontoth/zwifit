const settings = require('../settings');
const Constants = require('./ifit/_constants');
const Request = require('./ifit/_request');

const readlineUtils = require('readline-utils');
const rl = readlineUtils.createInterface();
initKeyboard();

let updateValueCallback = undefined;
let maxValueSize = -1;
let currentCommand = undefined;
let currentRequestLength = -1;
let currentRequestOffset = 0;
let currentRequestBuffer = undefined;
let currentResponse = undefined;
let currentResponseIndex = 0;
let currentDevice = 2;
let shutdown = false;
let refreshDisplay = true;

const state = {}; // simulated treadmill
state[Constants.Characteristic.MaxIncline.id] = 4;
state[Constants.Characteristic.MinIncline.id] = 0;
state[Constants.Characteristic.MaxKph.id] = 20;
state[Constants.Characteristic.MinKph.id] = 0;
state[Constants.Characteristic.MaxPulse.id] = 255;
state[Constants.Characteristic.Kph.id] = 0;
state[Constants.Characteristic.CurrentKph.id] = 0;
state[Constants.Characteristic.CurrentDistance.id] = 0;
state[Constants.Characteristic.Distance.id] = 0;
state[Constants.Characteristic.Incline.id] = 0;
state[Constants.Characteristic.CurrentIncline.id] = 0;
state[Constants.Characteristic.AverageIncline.id] = 0;
state[Constants.Characteristic.Calories.id] = 0;
state[Constants.Characteristic.CurrentCalories.id] = 0;
state[Constants.Characteristic.Volume.id] = 70;
state[Constants.Characteristic.Mode.id] = Constants.Mode.Idle;
state[Constants.Characteristic.Pulse.id] = { pulse: 0, source: Constants.PulseSource.No };
state[Constants.Characteristic.MaxPulse.id] = 177;
state[Constants.Characteristic.CurrentTime.id] = 0;
state[Constants.Characteristic.UpTime.id] = 0;
state[Constants.Characteristic.PausedTime.id] = 0;
state[Constants.Characteristic.Metric.id] = true;

function discoverActivationCode() {
	settings.load();
	if (settings.bleDetails) {
		startSimulator();
	} else {
		loadTreadmillDetails();
	}
}

function prettyPrintedBleCode() {
	return settings.bleCode.substring(2) + settings.bleCode.substring(0, 2);
}

function processPeripheralError(peripheral, error, exit = false) {
	console.log("ERROR: ", error);
	if (exit) {
		process.exit(1);
	} else {
		peripheral.disconnect();
	}
}

function loadTreadmillDetails() {
	
	const noble = require('noble');
	
	// start scanning for sports equiments
	noble.on('stateChange', (state) => {
		if (state === 'poweredOn') {
			console.log('Turn on your treadmill!');
			noble.startScanning();
		} else {
			noble.stopScanning();
		}
	});
	
	// once a BLE device was found check if it is a iFit sport equiment
	noble.on('discover', (peripheral) => {
		if (! peripheral.advertisement.manufacturerData) {
			return;
		}
		if (peripheral.advertisement.manufacturerData
				&& peripheral.advertisement.manufacturerData.toString('hex')
						.toLowerCase().endsWith('dd' + settings.bleCode)) {
			const deviceName = peripheral.advertisement.localName;
			console.log('Found treadmill name with code ' + prettyPrintedBleCode()
					+ ' and name ' + deviceName);
			
			noble.stopScanning();
			
			settings.bleAdvertisingData = buildAdvertisingData(peripheral.advertisement.serviceUuids).toString('hex');
			settings.bleScanData = buildScanData(peripheral.advertisement.localName, peripheral.advertisement.manufacturerData).toString('hex');
			settings.bleDeviceName = deviceName;
			
			peripheral.on('disconnect', () => {
				process.exit(0);
			});
			
			peripheral.connect((error) => {
				console.log('Connected to treadmill...');
				if (error) {
					processPeripheralError(peripheral, error, true);
					return;
				}
				
				peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
					console.log('Discovered all treadmill services...');
					
					if (error) {
						processPeripheralError(peripheral, error);
						return;
					}
					
					let rxCharacteristic = false;
					let txCharacteristic = false;

					settings.bleServices = services
						.filter(service => (service.uuid !== '1800')    // handled by bleno
								&& (service.uuid !== '1801'))           // handled by bleno
						.map(service =>
							({
								uuid: service.uuid,
								characteristics: service.characteristics.map(characteristic => {
									if (characteristic.uuid === Constants.BleUUID.Characteristic.Tx) {
										txCharacteristic = true;
									} else if (characteristic.uuid === Constants.BleUUID.Characteristic.Rx) {
										rxCharacteristic = true;
									}
									return {
										uuid: characteristic.uuid,
										properties: characteristic.properties
									};
								})
							}));
					if (!rxCharacteristic || !txCharacteristic) {
						console.log('ERROR: Could not find expected Bluetooth services and characteristics: Your device is incompatible!');
						peripheral.disconnect();
						return;
					}

					Request.initTxAndRx(peripheral, (error, tx, rx) => {
						if (error) {
							processPeripheralError(peripheral, error);
							return;
						}
						loadEquipmentInformation(peripheral, tx, rx);
					});
				});
			});
		}
	});
	
}

function loadEquipmentInformation(peripheral, tx, rx) {

	console.log('Retrieving information from treadmill...');
	const preAuthCalls = {};
	
	Request.rawRequest(Request.Commands.EquipmentInformation, undefined, Constants.SportsEquipment.General, tx, rx, (result, error) => {
			console.log('1/6');
			if (error) {
				processPeripheralError(peripheral, error, true);
			}
			const equipment = result.header.equipment;
			preAuthCalls[Request.Commands.EquipmentInformation] = result.response;
			
			Request.rawRequest(Request.Commands.SupportedCapabilities, undefined, equipment, tx, rx, (result, error) => {
				console.log('2/6');
				if (error) {
					processPeripheralError(peripheral, error, true);
				}
				preAuthCalls[Request.Commands.SupportedCapabilities] = result.response;
				
				Request.rawRequest(Request.Commands.SupportedCommands, undefined, equipment, tx, rx, (result, error) => {
					console.log('3/6');
					if (error) {
						processPeripheralError(peripheral, error, true);
					}
					preAuthCalls[Request.Commands.SupportedCommands] = result.response;
					
					Request.rawRequest(Request.Commands.EquipmentInformation2, Buffer.alloc(2), equipment, tx, rx, (result, error) => {
						console.log('4/6');
						if (error) {
							processPeripheralError(peripheral, error, true);
						}
						preAuthCalls[Request.Commands.EquipmentInformation2] = result.response;
						
						Request.rawRequest(Request.Commands.EquipmentInformation3, Buffer.alloc(2), equipment, tx, rx, (result, error) => {
							console.log('5/6');
							if (error) {
								processPeripheralError(peripheral, error, true);
							}
							preAuthCalls[Request.Commands.EquipmentInformation3] = result.response;
							
							Request.rawRequest(Request.Commands.EquipmentInformation4, undefined, equipment, tx, rx, (result, error) => {
								console.log('6/6');
								if (error) {
									processPeripheralError(peripheral, error, true);
								}
								preAuthCalls[Request.Commands.EquipmentInformation4] = result.response;
								
								settings.bleDetails = preAuthCalls;
								settings.save();
								
								console.log('Done. Now switch off your treadmill!');
								console.log('Afterwards restart this program for further instructions...');

								peripheral.disconnect();
							});
						});
					});
				});
			});
		});

}

function processWriteAndRead() {
	const { writes, reads } = parseRequest();
	processWrites(writes);
	const response = buildReadsResponse(reads);
	const result = buildResponseParts(response);
	return result;
}

function processWrites(writes) {
	if (!writes) {
		return;
	}
	writes.forEach(write => {
		if (! write.characteristic.readOnly) {
			const id = write.characteristic.id;
			if (id === Constants.Characteristic.Pulse.id) {
				state[id] = {
						pulse: write.value.pulse,
						source: write.value.source
					};
			} else if (id === Constants.Characteristic.Mode.id) {
				const mode = Constants.Mode.fromId(write.value);
				console.log('Setting mode to ', mode, ' will be ignored due to lack off knowledge what is allowed on real equipments');
				// state[id] = mode;
			} else {
				state[id] = write.value;
			}
			refreshDisplay = true;
		}
	});
}

function buildResponseParts(response) {
	const parts = [];
	let offset = 0;
	let pos = 1;
	let done = false;
	while (!done) {
		done = offset + 18 >= response.length;
		const length = done ? response.length - offset : 18;
		const part = Buffer.alloc(20);
		part.writeUInt8(done ? 0xff : pos - 1, 0);
		part.writeUInt8(length, 1);
		response.copy(part, 2, offset, offset + length);
		offset += length;
		parts[pos] = part.toString('hex');
		++pos;
	}
	const header = Buffer.alloc(4);
	header.writeUInt8(0xfe, 0);
	header.writeUInt8(currentDevice, 1);
	header.writeUInt8(response.length, 2);
	header.writeUInt8(parts.length, 3);
	parts[0] = header.toString('hex');
	return parts;
}

function buildReadsResponse(reads) {
	const values = reads.map(read => {
		const value = state[read];
		const characteristic = Constants.Characteristic.fromId(read);
		if (!characteristic || !characteristic.converter) {
			console.log('Error: ', read);
			return Buffer.alloc(0);
		}
		const buffer = Buffer.alloc(characteristic.converter.size);
		characteristic.converter.toBuffer(buffer, 0, value);
		return buffer;
	});
	const overallSize = values.map(value => value.length).reduce((a, c) => a + c, 0);
	
	const response = Buffer.alloc(overallSize + 9);
	response.writeUInt8(1, 0);
	response.writeUInt8(currentDevice, 1);
	response.writeUInt8(2, 2);
	response.writeUInt8(response.length - 4, 3);
	response.writeUInt8(currentDevice, 4);
	response.writeUInt8(overallSize, 5);
	response.writeUInt8(2, 6);
	response.writeUInt8(2, 7);

	let pos = 8;
	values.forEach(value => {
		pos += value.copy(response, pos);
	});
	let checksum = currentDevice + overallSize + currentCommand + 2;
	for (let i = 8; i < response.length - 1; ++i) {
		checksum += response[i];
	}
	response.writeUInt8(checksum & 255, response.length - 1);

	return response;
}

function parseRequest() {
	let pos = 0;
	let bitMapLength = currentRequestBuffer[pos++];
	const writeBits = parseBitMap(pos, bitMapLength);
	pos += bitMapLength;
	const writes = [];
	writeBits.forEach(write => {
		const characteristic = Constants.Characteristic.fromId(write);
		const value = characteristic.converter.fromBuffer(currentRequestBuffer, pos);
		writes.push({
			characteristic,
			value
		})
		pos += characteristic.converter.size;
	});
	bitMapLength = currentRequestBuffer[pos++];
	const reads = parseBitMap(pos, bitMapLength);
	
	return { writes, reads };
}

function parseBitMap(pos, length) {
	const result = [];

	let end = pos + length;
	let count = 0;
	while (pos < end) {
		const value = currentRequestBuffer[pos];
		const base = count * 8;
		for (let i = 0; i < 8; ++i) {
			const mask = 1 << i;
			if (value & mask) {
				result.push(base + i);
			}
		}
		++pos;
		++count;
	}

	return result;
}

function startSimulator() {

	process.env['BLENO_DEVICE_NAME'] = settings.bleDeviceName;
	
	const bleno = require('bleno');
	const PrimaryService = bleno.PrimaryService;
	const Characteristic = bleno.Characteristic;
	
	console.log('Be sure your treadmill is switched off!');
	
	const onNotify = () => {
		if (!currentResponse || shutdown) {
			return;
		}

		const message = currentResponse[currentResponseIndex++];
		
		if (currentResponseIndex === currentResponse.length) {
			currentCommand = undefined;
			currentRequestLength = -1;
			currentRequestOffset = 0;
			currentRequestBuffer = undefined;
			currentResponse = undefined;
			currentResponseIndex = 0;
		}

		updateValueCallback(Buffer.from(message, 'hex'));
		
		if (process.platform === 'win32') { // on Windows onNotify is not called by bleno
			onNotify();
		}
	};

	const onWriteRequest = (data, offset, withoutResponse, callback) => {
		if (maxValueSize !== -1) {
			const bufferSize = offset + maxValueSize > data.length ? data.length - offset : maxValueSize;
			buffer = Buffer.alloc(bufferSize);
			data.copy(buffer, 0, offset, offset + bufferSize);
		}
		
		if (buffer[0] === Request.MessageIndex.Header) {
			currentRequestLength = buffer[2];
			currentDevice = buffer[3];
		} else {  // next parts of the request
			if (!currentRequestBuffer) {
				currentRequestBuffer = Buffer.alloc(currentRequestLength - 8);
				buffer.copy(currentRequestBuffer, 0, 9, buffer.length);
				currentRequestOffset += buffer.length - 9;
			} else {
				const contentLength = buffer[1] + currentRequestOffset >= currentRequestBuffer.length
						? currentRequestBuffer.length - currentRequestOffset : buffer[1];
				buffer.copy(currentRequestBuffer, currentRequestOffset, 2, contentLength + 2);
				currentRequestOffset += contentLength;
			}
		}
		if (buffer[0] === 0x00) { // first part of the request
			currentCommand = buffer[8];
		}
		
		callback(bleno.Characteristic.RESULT_SUCCESS);

		if (buffer[0] === Request.MessageIndex.Eof) {
			if (! currentCommand) {
				currentCommand = buffer[8];
			}
			currentResponse = settings.bleDetails[currentCommand];
			if (currentCommand === Request.Commands.Enable) {
				if (!currentResponse) {
					activationCode = currentRequestBuffer.toString('hex');
					console.log('Got activation code: ' + activationCode);
					console.log('');
					console.log('Now kill the app. It is not needed any more.');
					console.log('From now on you only need to start Zwifit by using \"npm start\"');
					bleno.disconnect();
					settings.bleActivation = activationCode;
					settings.save();
					setTimeout(() => { process.exit(0) }, 500);
				} else {
					currentResponseIndex = 0;
					setImmediate(onNotify);
				}
			} else if (currentCommand === Request.Commands.WriteAndRead) {
				currentResponse = processWriteAndRead();
				currentResponseIndex = 0;
				setImmediate(onNotify);
			} else {
				currentResponseIndex = 0;
				setImmediate(onNotify);
			}
			currentCommand = undefined;
		}
	};
	
	const onSubscribe = (newMaxValueSize, newUpdateValueCallback) => {
		updateValueCallback = newUpdateValueCallback;
		maxValueSize = newMaxValueSize;
	};
	
	const onUnsubscribe = () => {
		// nothing to do
	};
	
	const simulatorServices = settings.bleServices
			.map((service) => new PrimaryService({
					uuid: service.uuid,
					characteristics: service.characteristics
							.map((serviceCharacteristic) => {
								if (serviceCharacteristic.uuid === Constants.BleUUID.Characteristic.Tx) {
									return new Characteristic({
										uuid: serviceCharacteristic.uuid,
										properties: serviceCharacteristic.properties,
										onWriteRequest
									});
								} else if (serviceCharacteristic.uuid === Constants.BleUUID.Characteristic.Rx) {
									return new Characteristic({
										uuid: serviceCharacteristic.uuid,
										properties: serviceCharacteristic.properties,
										onSubscribe,
										onUnsubscribe,
										onNotify
									});
								} else {
									return new Characteristic({
										uuid: serviceCharacteristic.uuid,
										properties: serviceCharacteristic.properties
									});
								}
							})
				}));
	
	bleno.on('advertisingStart', (error) => {
		if (error) {
			console.log(error);
			return;
		}
		bleno.setServices(simulatorServices);
	});
	
	bleno.on('stateChange', (state) => {
		if (state === 'poweredOn') {
			bleno.startAdvertisingWithEIRData(
					Buffer.from(settings.bleAdvertisingData, 'hex'),
					Buffer.from(settings.bleScanData, 'hex'));
		}		
	});
	
	bleno.on('servicesSet', (error) => {
		if (error) {
			console.log('ERROR: ', error);
			process.exit(0);
		}
		if (settings.bleDetails[Request.Commands.Enable]) {
			setInterval(simulateBehavior, 500);
		} else {
			console.log('Now start your treadmill\'s manufactor\'s app.');
			console.log('There may be an email registration.');
			console.log('You will be prompted to connect to your treadmill having the code \''
					+ prettyPrintedBleCode() + '\'.');
			console.log('Choose this equipment and wait...');
		}
	});
	
	bleno.on('accept', (clientAddress) => {
		console.log('Connected to the app...');
		bleno.stopAdvertising();
	});
	
	bleno.on('disconnect', (clientAddress) => {
		console.log('Disconnected from the app.');
		bleno.startAdvertisingWithEIRData(
				Buffer.from(settings.bleAdvertisingData, 'hex'),
				Buffer.from(settings.bleScanData, 'hex'));
	});
	
}

function buildAdvertisingData(serviceUuids) {

	let serviceUuids16bit = [];
	let serviceUuids128bit = [];

	if (serviceUuids && serviceUuids.length) {
		for (i = 0; i < serviceUuids.length; i++) {
			var serviceUuid = new Buffer(serviceUuids[i].match(/.{1,2}/g).reverse().join(''), 'hex');

			if (serviceUuid.length === 2) {
				serviceUuids16bit.push(serviceUuid);
			} else if (serviceUuid.length === 16) {
				serviceUuids128bit.push(serviceUuid);
			}
		}
	}

	let advertisementDataLength = 3;
	
	if (serviceUuids16bit.length) {
		advertisementDataLength += 2 + 2 * serviceUuids16bit.length;
	}

	if (serviceUuids128bit.length) {
		advertisementDataLength += 2 + 16 * serviceUuids128bit.length;
	}

	let advertisementData = new Buffer(advertisementDataLength);

	// flags
	advertisementData.writeUInt8(2, 0);
	advertisementData.writeUInt8(0x01, 1);
	let pos = advertisementData.writeUInt8(0x05, 2);

	if (serviceUuids16bit.length) {
		pos = advertisementData.writeUInt8(1 + 2 * serviceUuids16bit.length, pos);
		pos = advertisementData.writeUInt8(0x03, pos);

		for (i = 0; i < serviceUuids16bit.length; i++) {
			serviceUuids16bit[i].copy(advertisementData, pos);
			pos += serviceUuids16bit[i].length;
		}
	}

	if (serviceUuids128bit.length) {
		pos = advertisementData.writeUInt8(1 + 16 * serviceUuids128bit.length, pos);
		pos = advertisementData.writeUInt8(0x07, pos);

		for (i = 0; i < serviceUuids128bit.length; i++) {
			serviceUuids128bit[i].copy(advertisementData, pos);
			pos += serviceUuids128bit[i].length;
		}
	}
	
	return advertisementData;
		
}

function buildScanData(localName, manufacturerData) {
	
	const scanDataLength = manufacturerData.length + localName.length + 4;
	const scanData = new Buffer(scanDataLength);
	let pos = scanData.writeUInt8(localName.length + 1);
	pos = scanData.writeUInt8(0x09, pos);
	var nameBuffer = new Buffer(localName);
	nameBuffer.copy(scanData, pos);
	pos += nameBuffer.length;
	pos = scanData.writeUInt8(manufacturerData.length + 1, pos);
	pos = scanData.writeUInt8(0xff, pos);
	manufacturerData.copy(scanData, pos);
	return scanData;
	
}

function simulateBehavior() {
	if (state[Constants.Characteristic.Mode.id] !== Constants.Mode.MissingSafetyKey) {
		if (state[Constants.Characteristic.Mode.id] === Constants.Mode.Active) {
			if (state[Constants.Characteristic.CurrentKph.id] > state[Constants.Characteristic.Kph.id]) {
				state[Constants.Characteristic.CurrentKph.id] -= 0.5;
			} else if (state[Constants.Characteristic.CurrentKph.id] < state[Constants.Characteristic.Kph.id]) {
				state[Constants.Characteristic.CurrentKph.id] += 0.5;
			}
		} else {
			if (state[Constants.Characteristic.CurrentKph.id] > 0) {
				state[Constants.Characteristic.CurrentKph.id] -= 0.5;
			}
		}
		if (state[Constants.Characteristic.CurrentIncline.id] > state[Constants.Characteristic.Incline.id]) {
			state[Constants.Characteristic.CurrentIncline.id] -= 0.5;
		} else if (state[Constants.Characteristic.CurrentIncline.id] < state[Constants.Characteristic.Incline.id]) {
			state[Constants.Characteristic.CurrentIncline.id] += 0.5;
		}
	}
	if (refreshDisplay) {
		readlineUtils.clearScreen(rl);
		console.log('Running in simulator mode:');
		console.log('Cursor left:  slower');
		console.log('Cursor right: faster');
		console.log('Cursor up:    incline');
		console.log('Cursor down:  decline');
		console.log('S:            remove/insert safety key');
		console.log('R:            start');
		console.log('X:            pause / stop / reset');
		console.log('M:            simulate user edits settings on equipment');
		console.log('Ctrl-C:       exit simulator');
		console.log('Current state: ', Constants.Mode.fromId(state[Constants.Characteristic.Mode.id]));
		console.log('KPH: ', state[Constants.Characteristic.Kph.id]);
		console.log('Incline: ', state[Constants.Characteristic.Incline.id]);
		refreshDisplay = false;
	}
}

function initKeyboard() {
	rl.input.on('keypress', function(str, key) {
		refreshDisplay = true;
		if (key.ctrl && key.name === 'c') {
			shutdown = true;
			setTimeout(process.exit, 500);
		} else if (key.name === 's') {
			if (state[Constants.Characteristic.Mode.id] !== Constants.Mode.MissingSafetyKey) {
				state[-1] = state[Constants.Characteristic.Mode.id];
				state[Constants.Characteristic.Mode.id] = Constants.Mode.MissingSafetyKey;
				state[Constants.Characteristic.CurrentKph.id] = 0;
				state[Constants.Characteristic.CurrentIncline.id] = 0;
				state[Constants.Characteristic.CurrentDistance.id] = 0;
				state[Constants.Characteristic.CurrentCalories.id] = 0;
				state[Constants.Characteristic.CurrentTime.id] = 0;
			} else {
				if (state[-1] === Constants.Mode.Active) {
					state[Constants.Characteristic.Mode.id] = Constants.Mode.Pause;
				} else {
					state[Constants.Characteristic.Mode.id] = state[-1];
				}
				state[Constants.Characteristic.CurrentIncline.id] = state[Constants.Characteristic.Incline.id];
			}
		} else if (key.name === 'r') {
			if (state[Constants.Characteristic.Mode.id] === Constants.Mode.Idle) {
				state[Constants.Characteristic.Mode.id] = Constants.Mode.Active;
			} else if (state[Constants.Characteristic.Mode.id] === Constants.Mode.Pause) {
				state[Constants.Characteristic.Mode.id] = Constants.Mode.Active;
			}
		} else if (key.name === 'x') {
			if (state[Constants.Characteristic.Mode.id] === Constants.Mode.Active) {
				state[Constants.Characteristic.Mode.id] = Constants.Mode.Pause;
			} else if (state[Constants.Characteristic.Mode.id] === Constants.Mode.Pause) {
				state[Constants.Characteristic.Mode.id] = Constants.Mode.Summary;
			} else {
				state[Constants.Characteristic.Mode.id] = Constants.Mode.Idle;
				state[Constants.Characteristic.Kph.id] = 0;
				state[Constants.Characteristic.CurrentKph.id] = 0;
				state[Constants.Characteristic.Distance.id] = 0;
				state[Constants.Characteristic.CurrentDistance.id] = 0;
				state[Constants.Characteristic.CurrentIncline.id] = 0;
				state[Constants.Characteristic.AverageIncline.id] = 0;
				state[Constants.Characteristic.Calories.id] = 0;
				state[Constants.Characteristic.CurrentCalories.id] = 0;
				state[Constants.Characteristic.CurrentTime.id] = 0;
			}
		} else if (key.name === 'm') {
			state[Constants.Characteristic.Mode.id] = Constants.Mode.Settings;
		} else if (key.name === 'up') {
			if (state[Constants.Characteristic.Incline.id] < state[Constants.Characteristic.MaxIncline.id]) {
				state[Constants.Characteristic.Incline.id] += 0.5;
			}
		} else if (key.name === 'down') {
			if (state[Constants.Characteristic.Incline.id] > 0) {
				state[Constants.Characteristic.Incline.id] -= 0.5;
			}
		} else if (key.name === 'left') {
			if (state[Constants.Characteristic.Kph.id] > 0) {
				state[Constants.Characteristic.Kph.id] -= 0.5;
			}
		} else if (key.name === 'right') {
			if (state[Constants.Characteristic.Kph.id] < state[Constants.Characteristic.MaxKph.id]) {
				state[Constants.Characteristic.Kph.id] += 0.5;
			}
		}
	});
}

discoverActivationCode();

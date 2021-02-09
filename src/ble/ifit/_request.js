const Constants = require('./_constants');

const ResponseOKCode = 2;
const maxBytesPerMessage = 18;

const Commands = function() {
	return {
		'WriteAndRead': 2,
		'Calibrate': 6,
		'SupportedCapabilities': 128,
		'EquipmentInformation': 129,
		'EquipmentInformation2': 130,
		'EquipmentInformation3': 132,
		'SupportedCommands': 136,
		'Enable': 144,
		'EquipmentInformation4': 149,
	};
}();
exports.Commands = Commands;

const MessageIndex = function() {
	return {
		'Header': 254,
		'Eof': 255,
	}
}();
exports.MessageIndex = MessageIndex;

/*
 * Build array of bytes with bits set according the values given.
 * The number of bytes depends on the highest bit to be set and
 * is stored in the first byte of the result.
 * 
 * Used as indicator for input and output value lists.
 */
function getBitMap(equipmentInformation, values) {
	
	const payload = [];
	payload[0] = 0;
	values && values.forEach(value => {
		let id = value.characteristic ? value.characteristic.id : value.id;
		// only supported characteristics
		if (equipmentInformation.characteristics[id]) {
			const pos = Math.floor(id / 8) + 1;
			if (pos > payload[0]) {
				payload[0] = pos;
			}
			let byte = payload[pos] || 0;
			const bit = id - (pos - 1) * 8;
			const mask = 1 << bit;
			byte |= mask;
			payload[pos] = byte;
		}
	});
	for (let i = 1; i < payload[0]; ++i) {
		if (!payload[i]) {
			payload[i] = 0;
		}
	}
	
	return payload;
	
}

/*
 * Writes a list of values in the order of their characteristic id
 * into a buffer. The values are converted using the characteric's
 * converter.
 */
function getWriteValues(writes) {
	
	if (!writes || (writes.length === 0)) {
		return undefined;
	}

	const writesMap = {};
	let size = 0;
	const writeIds = writes.map(write => {
			const writeId = write.characteristic.id;
			const converter = write.characteristic.converter;
			if (converter) {
				size += converter.size;
			} else {
				size += 1;
			}
			writesMap[writeId] = write;
			return writeId;
		});
	
	const payload = Buffer.alloc(size);
	let pos = 0;
	writeIds.sort(Constants.Sort.Asc).map(writeId => writesMap[writeId]).forEach(write => {
		const converter = write.characteristic.converter;
		if (converter) {
			pos += converter.toBuffer(payload, pos, write.value);
		} else {
			payload.writeUInt8(0, pos++);
		}
	});
	
	return payload;
	
};

/*
 * Initialize BLE characteristics necessary to write requests
 * and read results.
 */
function initTxAndRx(sportsEquipment, callback) {

	const serviceUUIDs = [Constants.BleUUID.Service.TxRx];
	const characteristicUUIDs = [Constants.BleUUID.Characteristic.Rx, Constants.BleUUID.Characteristic.Tx];
	sportsEquipment.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, function(error, services, characteristics) {
		if (error) {
			callback(error);
			return;
		}
		characteristics.forEach((characteristic) => {
			if (characteristic.uuid === Constants.BleUUID.Characteristic.Rx) {
				rx = characteristic;
			} else if (characteristic.uuid === Constants.BleUUID.Characteristic.Tx) {
				tx = characteristic;
			}
		});
		if (!rx) {
			callback('Unsupported sports equipment: missing BLE features (characteristic "Rx")');
		} else if (!tx) {
			callback('Unsupported sports equipment: missing BLE features (characteristic "Tx")');
		} else {
			subscribeTxAndRx(rx, function(error) {
				if (error) {
					callback('Could not initialize Tx/Rx: ' + error);
				} else {
					callback(null, tx, rx);
				}
			});
		}
	});
	
}
exports.initTxAndRx = initTxAndRx;

/*
 * Used to write and/or read values in one turn.
 */
function writeAndRead(equipmentInformation, writes, reads, tx, rx, callback) {

	const writePayload = getBitMap(equipmentInformation, writes);
	const readPayload = getBitMap(equipmentInformation, reads);
	const writeValues = getWriteValues(writes);
	const payload = Buffer.alloc(writePayload.length + readPayload.length + (writeValues ? writeValues.length : 0));
	let pos = 0;
	writePayload.forEach(byte => payload.writeUInt8(byte, pos++));
	if (writeValues) {
		pos += writeValues.copy(payload, pos);
	}
	readPayload.forEach(byte => payload.writeUInt8(byte, pos++));
	
	const request = buildRequest(equipmentInformation.equipment, Commands.WriteAndRead, payload);
	writeRequestAndGatherResponse(request, tx, rx, function(response, error, raw) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.WriteAndRead);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		const result = parseWriteAndReadResponse(equipmentInformation, response, reads, writes);
		if (result.error) {
			callback(null, result.error);
			return;
		}

		callback(result, null);
	});
	
}
exports.writeAndRead = writeAndRead;

/*
 * Send a given 'raw' request and return the notified chunks of the
 * response.
 */
function rawRequest(command, payload, equipment, tx, rx, callback) {
	
	const request = buildRequest(equipment, command, payload);
	writeRequestAndGatherResponse(request, tx, rx, function(response, error, raw) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, command);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		callback({ header, response: raw });
	});
	
}
exports.rawRequest = rawRequest;

/*
 * Determines what the equipment is capable to do on a details level.
 * The result is a map of characterstics (see _constants.js Characteristic)
 * using the id as the key. This is used in the writeAndRead request to
 * limit values to those the equipment is aware.
 * 
 * EE ... Constants.SportsEquipment.General = 2 = 0x02
 * LL ... length = 4 bytes = 0x04
 * CC ... command = 129 = 0x81
 * SS ... checksum = 2 + 4 + 129 = 135 = 0x87
 *
 * ff08020402040204818700000000000000000000
 *             EELLCCSS
 */
function getEquipmentInformation(tx, rx, callback) {

	const request = buildRequest(Constants.SportsEquipment.General, Commands.EquipmentInformation);
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.EquipmentInformation);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		const result = parseEquipmentInformationResponse(response);
		if (result.error) {
			callback(null, result.error);
			return;
		}

		callback({
			...header,
			...result
		}, null);
	});
	
}
exports.getEquipmentInformation = getEquipmentInformation;

/*
 * Enables the equipment for writing and reading values.
 */
function enable(equipmentInformation, tx, rx, callback, activationCode) {
	
	const payload = Buffer.from(activationCode, 'hex');
	const request = buildRequest(equipmentInformation.equipment, Commands.Enable, payload);
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.Enable);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		callback({}, null);
	});
	
}
exports.enable = enable;

/*
 * Returns more equipment information.
 */
exports.getEquipmentInformation2 = function(tx, rx, callback) {

	const request = buildRequest(Constants.SportsEquipment.General, Commands.EquipmentInformation2, Buffer.alloc(2));
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.EquipmentInformation2);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		callback(response, null);
	});
	
}

/*
 * Returns more equipment information.
 */
exports.getEquipmentInformation3 = function(tx, rx, callback) {

	const request = buildRequest(Constants.SportsEquipment.General, Commands.EquipmentInformation3, Buffer.alloc(2));
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.EquipmentInformation3);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		callback(response, null);
	});
	
}

/*
 * Determines what the equipment is capable to do on a high level.
 * The result is a list of ids (see _constants.js Capability).
 * 
 * EE ... Constants.SportsEquipment.Treadmill = 4 = 0x04
 * LL ... length = 4 bytes = 0x04
 * CC ... command = 128 = 0x80
 * SS ... checksum = 4 + 4 + 128 = 136 = 0x88
 *
 * ff08020402040404808800000000000000000000
 *             EELLCCSS
 */
exports.getSupportedCapabilities = function(equipmentInformation, tx, rx, callback) {
	
	const request = buildRequest(equipmentInformation.equipment, Commands.SupportedCapabilities);
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.SupportedCapabilities);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		const supportedCapabilities = parseFeaturesResponse(response);
		callback({ supportedCapabilities }, null);		
	});
	
}

/*
 * Determines what kind of commands are supported by the equipment.
 * 
 * EE ... Constants.SportsEquipment.Treadmill = 4 = 0x04
 * LL ... length = 4 bytes = 0x04
 * CC ... command = 136 = 0x88
 * SS ... checksum = 4 + 4 + 136 = 144 = 0x90
 *
 * ff08020402040404889000000000000000000000
 *             EELLCCSS
 */
exports.getSupportedCommands = function(equipment, tx, rx, callback) {
	
	const request = buildRequest(equipment, Commands.SupportedCommands);
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.SupportedCommands);
		if (header.error) {
			callback(null, header.error);
			return;
		}
		
		const supportedCommands = parseFeaturesResponse(response);
		callback({ supportedCommands }, null);		
	});
	
}

/*
 * Calibrates the incline of a treadmill. Once sent the
 * treadmill inclines to the max and declines to the lowest
 * possible position.
 */
exports.calibrateIncline = function(tx, rx, callback) {
	
	const request = buildRequest(Constants.Capability.Grade, Commands.Calibrate,
			Buffer.from('00', 'hex'));
	writeRequestAndGatherResponse(request, tx, rx, function(response, error) {
		if (error) {
			callback(null, error);
			return;
		}
		
		const header = parseCommandHeader(response, Commands.Calibrate);
		if (header.error) {
			callback(null, header.error);
		} else {
			callback(null, null);
		}
	});
	
}

/*
 * -- ... unknown
 * EE ... Constants.SportsEquipment.Treadmill = 4 = 0x04
 * LL ... length = 4 bytes = 0x04
 * CC ... command = 136 = 0x88
 * SS ... checksum = 4 + 4 + 136 = 144 = 0x90
 *
 * ff08020402040404889000000000000000000000
 *     ------LLEELLCCSS
 */
function buildRequest(equipment, command, payload) {

	const length = (payload ? payload.length : 0) + 4;
	const buf = Buffer.alloc(length + 4);
	
	let checksum = equipment + length + command;
	
	let pos = buf.writeUInt8(2);    // unknown
	pos = buf.writeUInt8(4, pos);  // unknown
	pos = buf.writeUInt8(2, pos);  // unknown
	pos = buf.writeUInt8(length, pos);
	pos = buf.writeUInt8(equipment, pos);
	pos = buf.writeUInt8(length, pos);
	pos = buf.writeUInt8(command, pos);
	if (payload) {
		for (const b of payload) {
			checksum += b;
			pos = buf.writeUInt8(b, pos);
		}
	}
	buf.writeUInt8(checksum & 255, pos);
	
	return buf;
	
}

/*
 * TT ... MessageIndex.Header = 254 = 0xfe
 * -- ... unknown
 * LL ... length of the following request in bytes (e.g 8 = 0x08)
 * NN ... number of writes including the header (e.g. 2 = 0x02)
 *
 * fe020802
 * TT--LLNN
 */
function requestHeader(request, numberOfWrites) {
	
	const length = request.length;
	
	const buf = Buffer.alloc(4);
	
	let pos = buf.writeUInt8(MessageIndex.Header);
	pos = buf.writeUInt8(2, pos); // unknown
	pos = buf.writeUInt8(length, pos);
	buf.writeUInt8(numberOfWrites + 1, pos);
	
	return buf;
	
}

/*
 * If the request is longer than the standard MTU (20 bytes)
 * the payload is splitted into several chunks.
 * 
 * TT ... MessageIndex.Eof = 255 = 0xff or index of message (0, 1, ...)
 * LL ... length of the following request in bytes (e.g 8 = 0x08)
 *
 * ff08020402040404889000000000000000000000
 * TTLL
 */
function buildWriteMessages(request) {
	
	const numberOfWrites = Math.ceil(request.length / maxBytesPerMessage);

	const messages = new Array();
	messages.push(requestHeader(request, numberOfWrites));
	
	let offset = 0;
	let counter = 1;
	let done = offset == request.length;
	while (!done) {
		const message = Buffer.alloc(20);
		const length = counter < numberOfWrites ? maxBytesPerMessage : ((request.length - 1) % maxBytesPerMessage + 1);

		let pos = message.writeUInt8(counter - 1);
		pos = message.writeUInt8(length, pos);
		request.copy(message, pos, offset, offset + length);
		
		offset += length;
		done = offset == request.length;
		
		if (done) {
			message.writeUInt8(MessageIndex.Eof, 0);
		} else {
			++counter;
		}
		
		messages.push(message);
	}
	
	return messages;
	
}

/*
 * Determine the message index based on the first byte of a chunk:
 * 
 * MessageIndex.Header for the header chunk
 * 0...255 for intermediate chunks
 * MessageIndex.Eof for the last chunk
 */
function determineMessageIndex(message) {

	if (message.length < 1) {
		return { error: 'unexpected message format - one byte expected at least but got \"' + message.toString('hex') + '\"' };
	}
	
	return message.readUInt8(0);

}

/*
 * TT ... MessageIndex.Header = 254 = 0xfe
 * -- ... unknown
 * LL ... length of the following response in bytes (e.g 8 = 0x08)
 * NN ... number of writes including the header (e.g. 2 = 0x02)
 *
 * fe022303b4000000000000000000000000000000
 * TT--LLNN
 */
function getHeaderFromResponse(message) {

	if (message.length < 4) {
		return { error: 'unexpected message format - four bytes expected at least' };
	}
	if (message.readUInt8(0) != MessageIndex.Header) {
		return { error: 'message is not a header: expected first byte to be 0xfe but was ' + message.readUInt8(0) };
	}
	
	const bufLength = message.readUInt8(2);
	const upcomingMessages = message.readUInt8(3) - 1;
	
	const buffer = Buffer.alloc(bufLength);
	
	return { upcomingMessages, buffer };
	
}

/*
 * TT ... MessageIndex.Eof = 255 = 0xff or index of message
 * LL ... length of the following response in bytes (e.g 8 = 0x08)
 *
 * ff02230300000000000000000000000000000000
 * TTLL
 */
function fillResponse(buf, numberOfReades, message) {
	
	if (!buf) {
		return { error: 'undefined buffer' };
	}
	if (message.length < 2) {
		return { error: 'unexpected message format - two bytes expected at least' };
	}
	
	const indexOfMessage = message.readUInt8(0);
	if ((indexOfMessage !== MessageIndex.Eof) && (indexOfMessage >= numberOfReades)) {
		return { error: 'index of message exceeds number of expected reads: ' + indexOfMessage + '>=' + numberOfReades };
	}

	const pos = (indexOfMessage == MessageIndex.Eof ? numberOfReades - 1 : indexOfMessage) * 18;
	
	const length = message.readUInt8(1);
	if (length + pos > buf.length) {
		return { error: 'amount of data in message exceeds buffer size: ' + (length + pos) + '>' + buf.length };
	}
	
	message.copy(buf, pos, 2, length + 2);
	
	return buf;
	
}

/*
 * Write a list of messages (header, body, etc.) to the given tx channel.
 */
function writeMessages(messages, tx, callback, currentMessageIdx = 0) {

	if (currentMessageIdx >= messages.length) {
		callback(null);
		return;
	}
	
	tx.write(messages[currentMessageIdx], false, function(error) {
		if (error) {
			callback(error);
		} else {
			writeMessages(messages, tx, callback, currentMessageIdx + 1);
		}
	});

}

/*
 * Subscribe to rx channel for receiving chunks of a request's response.
 */
function subscribeTxAndRx(rx, callback) {
	
	rx.subscribe(function(subscriptionError) {
		callback(subscriptionError);
	});
	
}

/*
 * Writes a request and collects the response using the given
 * tx and rx channels.
 */
function writeRequestAndGatherResponse(request, tx, rx, callback) {
	
	const raw = [];
	
	const listener = function(message) {
		raw.push(message.toString('hex'));
		const messageIndex = determineMessageIndex(message);
		if (messageIndex === MessageIndex.Header) {
			const { error, upcomingMessages, buffer } = getHeaderFromResponse(message);
			error && reportError(error);
			response.upcomingMessages = upcomingMessages;
			response.buffer = buffer;
		} else if (messageIndex === MessageIndex.Eof) {
			const { error } = fillResponse(response.buffer, response.upcomingMessages, message);
			error && reportError(error);
			rx.removeListener('read', listener);
			if(response && response.buffer) {
				if (response.buffer.length > 5) {
					let checksum = 0;
					for (let i = 4; i < response.buffer.length - 1; ++i) {
						checksum += response.buffer[i];
					}
					checksum = checksum & 255;
					if (checksum !== response.buffer[response.buffer.length - 1]) {
						reportError('checksum invalid');
					}
				}
				callback(response.buffer, null, raw);
			}
		} else {
			const { error } = fillResponse(response.buffer, response.upcomingMessages, message);
			error && reportError(error);
		}
	};
	 
	const reportError = function(error) {
		rx.removeListener('read', listener);
		callback(null, error);
	}
	
	const response = {
		upcomingMessages: -1,
		buffer: null
	};
	
	if (!rx) {
		callback(null, 'disconnected');
		return;
	}
	rx.on('read', listener);

	const messages = buildWriteMessages(request);
	writeMessages(messages, tx, function(writeError) {
		writeError && reportError(writeError);
	});

}

/*
 * -- ... unknown
 * EE ... see Constants.SportsEquipment
 * LL ... length = 28 bytes (32 - 4 header) = 0x1c
 * CC ... see Constants.Commands = 0x81 = 129
 * SS ... see Constants.Status = 0x02 = OK
 * 0104021c041c810250010300000000000ed3fefbdbfcfb3b0ce71f00c0d3189b
 * ------LLEELLCCSS
 */
const parseCommandHeader = function(response, expectedCommand) {

	if (response.length < 4) {
		return { error: 'Unexpected buffer length - must be greater than 4 bytes!' };
	}
	const length = response.readUInt8(3);
	if (response.length != length + 4) {
		return { error: 'Buffer length is ' + response.length + ' but header says it has to be ' + (length + 4) + ' bytes!' };
	}
	
	let pos = 4; // skip first 4 bytes
	const equipment = response.readUInt8(pos++);
	++pos; // skip next byte. its the length which is the same as in the header
	const command = response.readUInt8(pos++);
	if (command !== expectedCommand) {
		return { error: 'Expected command ' + expectedCommand + ' but got ' + command + '!'};
	}
	const status = response.readUInt8(pos++);
	if (status !== ResponseOKCode) {
		return { error: 'Response code not OK: ' + status + '!' };
	}
	
	return {
		equipment
	};
	
}

/*
 * -- ... unknown
 * LL ... number bytes for equipment characteristics
 * CC ... characteristics as bits
 *
 * 0104021c041c810250010300000000000ed3fefbdbfcfb3b0ce71f00c0d3189b
 * ------LLEELLCCSS----------------LL
 */
const parseEquipmentInformationResponse = function(response) {

	let pos = 16;
	const length = response.readUInt8(pos++);
	
	const characteristics = {};
	for (let offset = 0; offset < length; ++offset) {
		const byte = response.readUInt8(pos++);
		for (let bit = 0; bit < 8; ++bit) {
			const mask = 1 << bit;
			if (byte & mask) {
				const id = offset * 8 + bit;
				const characteristic = Constants.Characteristic.fromId(id);
				if (characteristic) {
					characteristics[characteristic.id] = characteristic;
				}
			}
		}
	}
	
	return {
		characteristics
	};
	
}

/*
 * For feature responses every byte is the id of a certain
 * features. The first byte is the number of features.
 */
const parseFeaturesResponse = function(response) {

	let pos = 8;
	let count = response.readUInt8(pos++);
	const capabilities = [];
	while (count) {
		capabilities.push(response.readUInt8(pos++));
		--count;
	}
	
	return capabilities;
	
}

/*
 * Returns a map with characteristic values for each value requested in the request.
 */
const parseWriteAndReadResponse = function(equipmentInformation, response, reads, writes) {
	
	const result = {};

	if (!reads) {
		return result;
	}

	const readIds = reads.map(read => read.characteristic ? read.characteristic.id : read.id);
	
	let pos = 8;
	readIds.sort(Constants.Sort.Asc).forEach(id => {
		const characteristic = equipmentInformation.characteristics[id];
		// only supported characteristics
		if (characteristic) {
			const converter = characteristic.converter;
			if (converter) {
				result[characteristic.name] = converter.fromBuffer(response, pos);
				pos += converter.size;
			}
		}
	});
	
	return result;
	
}

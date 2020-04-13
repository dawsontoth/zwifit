exports.SportsEquipment = function() {
	const equipments = {
		'General': 2,
		'Treadmill': 4,
		'fromId': function(id) {
				for (let [key, value] of Object.entries(equipments)) {
					if (value === id) {
						return key;
					}
				}
				return undefined;
		}
	}
	return equipments;
}();

const PulseSource = function() {
	const sources = {
		'No': 0,
		'Hand': 1,
		'Unknown': 2,
		'Unknown2': 3,
		'Ble': 4,
		'fromId': function(id) {
				for (let [key, value] of Object.entries(sources)) {
					if (value === id) {
						return key;
					}
				}
				return undefined;
		}
	}
	return sources;
}();
exports.PulseSource = PulseSource;

const Mode = function() {
	const modes = {
		    'Unknown': 0,
		    'Idle': 1,
		    'Active': 2,
		    'Pause': 3,
		    'Summary': 4,
		    'Settings': 7,
		    'MissingSafetyKey': 8,
		    'fromId': function(id) {
				for (let [key, value] of Object.entries(modes)) {
					if (value === id) {
						return key;
					}
				}
				return 'Unkown';
		}
	}
	return modes;
}();
exports.Mode = Mode;

const Sort = function() {
	const sorts = {
		'Asc': (a, b) => a - b,
		'Desc': (a, b) => b - a,
	}
	return sorts;
}();
exports.Sort = Sort;

const Converter = function() {
	const converters = {
		'Double': {
			size: 2,
			fromBuffer: (buffer, pos) => (buffer.readUInt16LE(pos) / 100),
			toBuffer: (buffer, pos, value) => {
				buffer.writeUInt16LE(Math.round(value * 100), pos);
				return pos + 2;
			},
		},
		'Boolean': {
			size: 1,
			fromBuffer: (buffer, pos) => (buffer.readUInt8(pos) == 1),
			toBuffer: (buffer, pos, value) => {
				buffer.writeUInt8(value ? 1 : 0, pos);
				return pos + 1;
			},
		},
		'Mode': {
			size: 1,
			fromBuffer: (buffer, pos) => buffer.readUInt8(pos),
			toBuffer: (buffer, pos, value) => {
				buffer.writeUInt8(value);
				return pos + 1;
			},
		},
		'Calories': {
			size: 4,
			fromBuffer: (buffer, pos) => (buffer.readUInt32LE(pos) * 1024 / 100000000),
			toBuffer: (buffer, pos, value) => {
				buffer.writeUInt32LE(value * 100000000 / 1024, pos);
				return pos + 4;
			},
		},
		'Pulse': {
			size: 4,
			fromBuffer: (buffer, pos) => {
				const pulse = buffer.readUInt8(pos++);
				const average = buffer.readUInt8(pos++);
				const count = buffer.readUInt8(pos++);
				const source = PulseSource.fromId(buffer.readUInt8(pos++));
				return { pulse, average, count, source };
			},
			toBuffer: (buffer, pos, value) => {
				const { pulse, source } = value;
				buffer.writeUInt8(pulse, pos);
				buffer.writeUInt8(source, pos + 3);
				return pos + 4;
			},
		},
		'OneByteInteger': {
			size: 1,
			fromBuffer: (buffer, pos) => buffer.readUInt8(pos),
			toBuffer: (buffer, pos, value) => {
				buffer.writeUInt8(value, pos);
				return pos + 1;
			},
		},
		'TwoBytesInteger': {
			size: 2,
			fromBuffer: (buffer, pos) => buffer.readUInt16LE(pos),
			toBuffer: (buffer, pos, value) => {
				buffer.writeUInt16LE(value, pos);
				return pos + 2;
			},
		},
		'FourBytesInteger': {
			size: 4,
			fromBuffer: (buffer, pos) => buffer.readUInt32LE(pos),
			toBuffer: function(buffer, pos, value) {
				buffer.writeUInt32LE(value, pos);
				return pos + 4;
			},
		}
	};
	return converters;
}();
exports.Converter = Converter;

exports.Characteristic = function() {
	const characteristics = {
		'Kph': {
			id: 0,
			readOnly: false,
			converter: Converter.Double,
		},
		'Incline': {
			id: 1,
			readOnly: false,
			converter: Converter.Double,
		},
		'CurrentDistance': {
			id: 4,
			readOnly: true,
			converter: Converter.FourBytesInteger,
		},
		'Distance': {
			id: 6,
			readOnly: true,
			converter: Converter.FourBytesInteger,
		},
		'Volume': {
			id: 9,
			readOnly: false,
			converter: Converter.OneByteInteger,
		},
		'Pulse': {
			id: 10,
			readOnly: false,
			converter: Converter.Pulse,
		},
		'UpTime': {
			id: 11,
			readOnly: true,
			converter: Converter.FourBytesInteger,
		},
		'Mode': {
			id: 12,
			readOnly: false,
			converter: Converter.Mode,
		},
		'Calories': {
			id: 13,
			readOnly: true,
			converter: Converter.Calories,
		},
		'CurrentKph': {
			id: 16,
			readOnly: true,
			converter: Converter.Double,
		},
		'CurrentIncline': {
			id: 17,
			readOnly: true,
			converter: Converter.Double,
		},
		'CurrentTime': {
			id: 20,
			readOnly: true,
			converter: Converter.FourBytesInteger,
		},
		'CurrentCalories': {
			id: 21,
			readOnly: true,
			converter: Converter.Calories,
		},
		'MaxIncline': {
			id: 27,
			readOnly: true,
			converter: Converter.Double,
		},
		'MinIncline': {
			id: 28,
			readOnly: true,
			converter: Converter.Double,
		},
		'MaxKph': {
			id: 30,
			readOnly: true,
			converter: Converter.Double,
		},
		'MinKph': {
			id: 31,
			readOnly: true,
			converter: Converter.Double,
		},
		'Metric': {
			id: 36,
			readOnly: false,
			converter: Converter.Boolean,
		},
		'MaxPulse': {
			id: 49,
			readOnly: true,
			converter: Converter.OneByteInteger,
		},
		'AverageIncline': {
			id: 52,
			readOnly: true,
			converter: Converter.Double,
		},
		'TotalTime': {
			id: 70,
			readOnly: true,
			converter: Converter.FourBytesInteger,
		},
		'PausedTime': {
			id: 103,
			readOnly: true,
			converter: Converter.FourBytesInteger,
		},
		'X1': {
			id: 34,
			readOnly: false,
			converter: Converter.TwoBytesInteger,
		},
		'X2': {
			id: 35,
			readOnly: false,
			converter: Converter.TwoBytesInteger,
		},
		'X3': {
			id: 43,
			readOnly: false,
			converter: Converter.Double,
		},
		'X4': {
			id: 46,
			readOnly: false,
			converter: Converter.TwoBytesInteger,
		},
		'X5': {
			id: 69,
			readOnly: false,
			converter: Converter.FourBytesInteger,
		},
		'X6': {
			id: 71,
			readOnly: false,
			converter: Converter.TwoBytesInteger,
		},
		'X7': {
			id: 100,
			readOnly: false,
			converter: Converter.OneByteInteger,
		},
		'fromId': function(id) {
			for (let [key, value] of Object.entries(characteristics)) {
				if (value.id === id) {
					return value;
				}
			}
			return undefined;
		}
	}
	for (let c in characteristics) {
		if (c !== 'fromId') {
			characteristics[c].name = c;
		}
	}
	return characteristics;
}();

exports.Capability = function() {
	const capabilities = {
		'Speed': {
			id: 65,
			characteristic: 0,
		},
		'Incline': {
			id: 66,
			characteristic: 1,
		},
		'Pulse': {
			id: 70,
			characteristic: 10,
		},
		'Key': {
			id: 71,
			characteristic: 7,
		},
		'Distance': {
			id: 77,
			characteristic: 6,
		},
		'Time': {
			id: 78,
			characteristic: 11,
		},
		'fromId': function(id) {
				for (let [key, value] of Object.entries(capabilities)) {
					if (value.id === id) {
						return { key, attributes: value };
					}
				}
				return undefined;
		}
	}
	return capabilities;
}();

exports.BleUUID = function() {
	return {
		'Service': {
			'TxRx': '000015331412efde1523785feabcd123',
		},
		'Characteristic': {
			'Rx': '000015351412efde1523785feabcd123',
			'Tx': '000015341412efde1523785feabcd123'
		}
	}
}();

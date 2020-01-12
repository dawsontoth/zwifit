let util = require('util'),
	bleno = require('@abandonware/bleno');

function TreadmillDataCharacteristic() {
	TreadmillDataCharacteristic.super_.call(this, {
		uuid: '2ACD',
		properties: ['notify'],
		value: null,
		descriptors: []
	});
}

util.inherits(TreadmillDataCharacteristic, bleno.Characteristic);

module.exports = TreadmillDataCharacteristic;
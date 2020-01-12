let util = require('util'),
	bleno = require('@abandonware/bleno');

function RSCMeasurementCharacteristic() {
	RSCMeasurementCharacteristic.super_.call(this, {
		uuid: '2A53',
		properties: ['notify'],
		value: null,
		descriptors: []
	});
}

util.inherits(RSCMeasurementCharacteristic, bleno.Characteristic);

module.exports = RSCMeasurementCharacteristic;
let util = require('util'),
	bleno = require('bleno');

// 16-bit feature flags
let feature = Buffer.from('0000000000000000', 'binary');

function FTMIBFeatureCharacteristic() {
	FTMIBFeatureCharacteristic.super_.call(this, {
		uuid: '2ACC', // https://www.bluetooth.com/xml-viewer/?src=https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Characteristics/org.bluetooth.characteristic.fitness_machine_feature.xml
		properties: ['read'],
		value: feature,
		descriptors: []
	});
}

util.inherits(FTMIBFeatureCharacteristic, bleno.Characteristic);

FTMIBFeatureCharacteristic.prototype.onReadRequest = function(offset, callback) {
	let result = this.RESULT_SUCCESS,
		data = feature;
	if (offset > data.length) {
		result = this.RESULT_INVALID_OFFSET;
		data = null;
	}
	callback(result, data);
};

module.exports = FTMIBFeatureCharacteristic;
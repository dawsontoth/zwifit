let util = require('util'),
	bleno = require('bleno');

function FTMIBDataCharacteristic() {
	FTMIBDataCharacteristic.super_.call(this, {
		uuid: '2AD2', // https://www.bluetooth.com/xml-viewer/?src=https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Characteristics/org.bluetooth.characteristic.indoor_bike_data.xml
		properties: ['notify'],
		value: null,
		descriptors: []
	});
}

util.inherits(FTMIBDataCharacteristic, bleno.Characteristic);

module.exports = FTMIBDataCharacteristic;
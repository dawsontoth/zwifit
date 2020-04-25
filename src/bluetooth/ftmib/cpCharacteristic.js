let util = require('util'),
	bleno = require('bleno');

// private variables
let feature = Buffer.from('0000000000000000', 'binary'),
	grade = 0;

// Create this Characteristic
function FTMIBControlPointCharacteristic() {
	FTMIBControlPointCharacteristic.super_.call(this, {
		uuid: '2AD9', // https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Characteristics/org.bluetooth.characteristic.fitness_machine_control_point.xml
		properties: ['read', 'write'],
		value: null,
		descriptors: []
	});
}
util.inherits(FTMIBControlPointCharacteristic, bleno.Characteristic);

// Functiom to be called when data is read
FTMIBControlPointCharacteristic.prototype.onReadRequest = function(offset, callback) {
	let result = this.RESULT_SUCCESS,
		data = feature;
	if (offset > data.length) {
		result = this.RESULT_INVALID_OFFSET;
		data = null;
	}
	callback(result, data);
};

// Public function to be called when data is written
FTMIBControlPointCharacteristic.prototype.onWriteRequest = function (data, offset, withoutResponse, callback) {
	
	// Make sure we have been given some data
	if(data == null || data.length <= 0) {
		callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH);
		return;
	}
	
	// Set Indoor Bike Simulation = 7 bytes of data with 0x11 as first byte
	// Byte 1 			: Indoor Bike Simulation
	// Bytes 2 and 3 	: Wind Speed; Meters Per Second; 0.001; SINT16
	// Bytes 4 and 5 	: Grade; %; 0.01; SINT16
	// Byte 6			: Coefficient of Rolling Resistance; unitless; 0.0001; UINT8
	// Byte 7			: Wind Resistance Coefficient; kg/m; 0.01; UINT8
	if(data.length == 7 && data[0] == 0x11) {
		grade = data.readInt16LE(3)/100.0; // Adjust by the 0.01 factor (1 count as integer = 0.01
		callback(this.RESULT_SUCCESS);
		return;
	}
	
	// Ignore all other writes and just assume all okay
	callback(this.RESULT_SUCCESS);
}

// Public function which returns the requested simulation gradient
// in units of % grade.
FTMIBControlPointCharacteristic.prototype.getSimulatedGrade = function() {
	return grade;
}

module.exports = FTMIBControlPointCharacteristic;
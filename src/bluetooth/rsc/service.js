let util = require('util'),
	bleno = require('bleno'),
	constants = require('../../constants');

function RSCService() {
	this.measurement = new (require('./measurementCharacteristic'))();

	RSCService.super_.call(this, {
		name: constants.NAME,
		uuid: '1814',
		characteristics: [
			this.measurement,
			new (require('./featureCharacteristic'))()
		]
	});
}

util.inherits(RSCService, bleno.PrimaryService);

module.exports = RSCService;
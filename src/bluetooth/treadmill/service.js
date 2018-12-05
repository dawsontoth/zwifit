let util = require('util'),
	bleno = require('bleno'),
	constants = require('../../constants');

function TreadmillService() {
	this.measurement = new (require('./dataCharacteristic'))();

	TreadmillService.super_.call(this, {
		name: constants.NAME,
		uuid: '1826',
		characteristics: [
			this.measurement,
			new (require('./featureCharacteristic'))()
		]
	});
}

util.inherits(TreadmillService, bleno.PrimaryService);

module.exports = TreadmillService;
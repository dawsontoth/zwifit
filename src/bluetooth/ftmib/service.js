let util = require('util'),
	bleno = require('bleno'),
	constants = require('../../constants');

function FTMIBService() {
	this.measurement = new (require('./dataCharacteristic'))();
	this.feature = new (require('./featureCharacteristic'))();
	this.controlpoint = new (require('./cpCharacteristic'))();
	
	FTMIBService.super_.call(this, {
		name: constants.NAME,
		uuid: '1826', // https://www.bluetooth.com/xml-viewer/?src=https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Services/org.bluetooth.service.fitness_machine.xml
		characteristics: [
			this.measurement,
			this.feature,
			this.controlpoint
		]
	});
}

util.inherits(FTMIBService, bleno.PrimaryService);

module.exports = FTMIBService;
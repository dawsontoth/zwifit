#!/usr/bin/env node
let oneTime = require('./src/oneTimeSetup');
const settings = require('./src/settings');

oneTime.setup(() => {

	let api = require('./src/api'),
		bluetooth = require('./src/bluetooth'),
		onDeath = require('death');

	/*
	 Initialization.
	 */
	bluetooth.start();
	let ifit = undefined;
	if(settings.sim) {
		ifit = require('./src/sim');
	} else if (settings.ble) {
		ifit = require('./src/ble/ifit');
	} else {
		ifit = require('./src/ifit');
	}
	if (process.env['SHUTDOWN_ONDISCONNECT']) {
		ifit.connect(() => process.exit(99));
	} else {
		ifit.connect();
	}
	api.start(bluetooth, ifit);
	onDeath(cleanUp);

	/*
	 Implementation.
	 */
	function cleanUp() {
		console.log('Shutting down...');
		setTimeout(() => process.exit(0), 1000);
	}

});

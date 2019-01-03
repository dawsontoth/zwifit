#!/usr/bin/env node
let oneTime = require('./src/oneTimeSetup');

oneTime.setup(() => {

	let ifit = require('./src/ifit'),
		api = require('./src/api'),
		bluetooth = require('./src/bluetooth'),
		onDeath = require('death');

	/*
	 Initialization.
	 */
	api.start();
	bluetooth.start();
	ifit.connect();
	onDeath(cleanUp);

	/*
	 Implementation.
	 */
	function cleanUp() {
		console.log('Shutting down...');
		setTimeout(() => process.exit(0), 1000);
	}

});

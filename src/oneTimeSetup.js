let fs = require('fs'),
	os = require('os'),
	readline = require('readline'),
	settings = require('./settings');

/*
 Public API.
 */
exports.setup = setup;

/*
 State.
 */
let readlineInterface,
	machineType = 'treadmill';

/*
 Implementation.
 */
async function setup(ready) {
	console.log('Welcome to Zwifit!');
	if (!fs.existsSync('./node_modules')) {
		console.log('Please run `npm install` before trying to run this.');
		process.exit(1);
	}
	let goAhead = true;
	if (settings.load()) {
		if (settings.ble && !settings.bleActivation) {
			if(settings.bike) {
				machineType = 'Indoor Bike';
			}
			showBleActivationMessage();
			goAhead = false;
		}
	}
	else {
		goAhead = await readSettings();
	}
	if (goAhead) {
		console.log('You can visit http://' + os.hostname() + '.local:1337 to update settings.');
		ready();
	}

	async function readSettings() {
		readlineInterface = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		settings.metric = isYes(await question('Do you want to use metric units (KPH)? (Answer Y or N)'));
		settings.bike = await isYes(await question('Is your fitness machine a bike (Y) or treadmill (N)? (Answer Y or N)'));
		if(settings.bike) {
			machineType = 'Indoor Bike';
		}
		settings.ble = await isYes(await question('Is your '+machineType+' Bluetooth (Y) or WIFI (N) based? (Answer Y or N)'));
		if (settings.ble) {
			settings.bleCode = await question('Switch on your '+machineType+', press the connect button and enter the code shown on the display');
			if (settings.bleCode.length != 4) {
				console.log('The code must be of exact 4 characters!');
				return false;
			}
			settings.bleCode = settings.bleCode.substring(2, 4) + settings.bleCode.substring(0, 2);
			showBleActivationMessage();
			return false;
		} else if(settings.bike) {
			console.log('WIFI bike is not supported, sorry, exiting');
			setTimeout(() => process.exit(0), 500);
			return false;
		} else {
			settings.ip = await question('What is the IP of your treadmill? (Leave blank to search)');
			finalize();
			return true;
		}
	}
}

function finalize() {
	if (readlineInterface) readlineInterface.close();
	settings.save();
}

function showBleActivationMessage() {
	console.log('Now you need to call \"npm run enable-ble\" to get access to your');
	console.log('Bluetooth equipment by using the '+machineType+'\'s manufactor\'s app...');
	finalize();
	setTimeout(() => process.exit(0), 500);
}

function question(q) {
	return new Promise(resolve => readlineInterface.question(q + ' ', resolve));
}

function isYes(val) {
	if (val) {
		val = val.toLowerCase().trim();
	}
	return !!val
		&& (val === '1'
			|| val === '!'
			|| val === 'y'
			|| val === 'ye'
			|| val === 'yes'
			|| val === 'yess'
			|| val === 'please'
			|| val === 'yes please'
			|| val === 'yesplease'
			|| val === 'si'
			|| val === 'oui'
			|| val === 'ja');
}
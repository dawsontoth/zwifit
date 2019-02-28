let fs = require('fs'),
	readline = require('readline'),
	settings = require('./settings');

/*
 Public API.
 */
exports.setup = setup;

/*
 State.
 */
let readlineInterface;

/*
 Implementation.
 */
async function setup(ready) {
	console.log('Welcome to Zwifit!');
	if (!fs.existsSync('./node_modules')) {
		console.log('Please run `npm install` before trying to run this.');
		process.exit(1);
	}
	if (settings.load()) {
		ready();
	}
	else {
		await readSettings();
	}

	async function readSettings() {
		readlineInterface = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		settings.ip = await question('What is the IP of your treadmill? (Leave blank to search)');
		settings.metric = isYes(await question('Do you want to use metric units (KPH)? (Answer Y or N)'));
		console.log('Awesome! You can visit http://raspberrypi.local:1337 to update these settings later.');

		readlineInterface.close();
		settings.save();
		ready();
	}
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
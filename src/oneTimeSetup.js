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
		readSettings();
	}

	function readSettings() {
		readlineInterface = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		// In the future, we can ask for more.
		question('What is the IP of your treadmill?').then(ip => {
			readlineInterface.close();
			settings.ip = ip;
			settings.save();
			ready();
		});
	}
}

function question(q) {
	return new Promise(resolve => readlineInterface.question(q + ' ', resolve));
}
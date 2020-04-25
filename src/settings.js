let yaml = require('js-yaml'),
	fs = require('fs'),
	path = require('path');

/*
 Settings objects public variables
 */
exports.version = 1;
exports.metric = false;
exports.ip = null;
exports.sim = false;
exports.bike = false;
exports.lastIP = null;
exports.speedOffset = 0;
exports.speedMultiplier = 1;
exports.broadcastRSC = false;
exports.broadcastFTMS = true;
exports.ble = false;
exports.bleCode = null;
exports.bleActivation = null;
exports.bleDetails = null;
exports.bleServices = null;
exports.bleAdvertisingData = null;
exports.bleScanData = null;

/*
 Settings object public functions
 */
exports.load = load;
exports.toJSON = toJSON;
exports.fromJSON = fromJSON;
exports.save = save;

/*
 Initialization of private variables
 */
let minimumVersion = 1,
	ref = path.join(__dirname, '..', 'settings.conf');

/*
 Load the settings from file
 */
function load() {
	if (!fs.existsSync(ref)) {
		return false;
	}
	try {
		let settings = yaml.safeLoad(fs.readFileSync(ref, 'UTF-8'));
		if (settings) {
			if (settings.version && settings.version < minimumVersion) {
				console.log('New settings have been added!');
				settings = null;
			}
			else {
				fromJSON(settings);
			}
		}
		return !!settings;
	}
	catch (err) {
		return false;
	}
}

/*
 Save the settings to file
 */
function save() {
	fs.writeFile(ref, yaml.safeDump(toJSON()), 'UTF-8', () => {});
}

/*
 Convert the setting values into a JSON key->value array
 */
function toJSON() {
	let settings = {};
	for (let key in exports) {
		if (exports.hasOwnProperty(key) && typeof exports[key] !== 'function') {
			settings[key] = exports[key];
		}
	}
	return settings;
}

/*
 Restore the given json key->value array into the settings values
 */
function fromJSON(json) {
	for (let key in json) {
		if (json.hasOwnProperty(key)) {
			exports[key] = json[key];
		}
	}
}
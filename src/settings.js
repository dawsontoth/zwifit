let yaml = require('js-yaml'),
	fs = require('fs'),
	path = require('path');

/*
 Public API.
 */
exports.version = 1;
exports.ip = null;

exports.load = load;
exports.save = save;

/*
 Initialization.
 */
let minimumVersion = 1,
	ref = path.join(__dirname, '..', 'settings.conf');

/*
 Implementation.
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
				for (let key in settings) {
					if (settings.hasOwnProperty(key)) {
						exports[key] = settings[key];
					}
				}
			}
		}
		return !!settings;
	}
	catch (err) {
		return false;
	}
}

function save() {
	let settings = {};
	for (let key in exports) {
		if (exports.hasOwnProperty(key) && key !== 'load' && key !== 'save') {
			settings[key] = exports[key];
		}
	}
	fs.writeFileSync(ref, yaml.safeDump(settings), 'UTF-8');
}

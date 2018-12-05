let debug = false;

/*
 State.
 */
let listeners = {};

/*
 Public API.
 */
exports.stop = 'stop';
exports.on = addEventListener;
exports.has = hasEventListeners;
exports.clearAll = clearEventListeners;
exports.delayedFire = delayedFireEvent;
exports.fire = fireEvent;
exports.curryFire = curryFireEvent;
exports.off = removeEventListener;
exports.curryOff = curryRemoveEventListener;
exports.offAll = removeAllEventListeners;
exports.once = once;

/*
 Implementation.
 */

function addEventListener(name, func) {
	if (!listeners[name]) {
		listeners[name] = [];
	}
	if (typeof func !== 'function') {
		throw new Error('Second argument to addEventListener/on must be a function!'
			+ '\nName: ' + name
			+ '\nFunction: ' + func + ' (a ' + (typeof func) + ')');
	}
	debug && console.log('adding listener for ' + name);
	listeners[name].push(func);
	return exports;
}

function hasEventListeners(name) {
	return !!listeners[name] && !!listeners[name].length;
}

function clearEventListeners() {
	listeners = {};
	return exports;
}

function delayedFireEvent(time, name, data) {
	let args = Array.prototype.slice.call(arguments, 1);
	setTimeout(() => {
		fireEvent.apply(exports, args);
		time = name = data = null;
	}, time);
	return exports;
}

function fireEvent(name, data) {
	let listener = listeners[name],
		args = Array.prototype.slice.call(arguments, 1),
		toRemove = [];
	debug && console.log('firing ' + name);
	if (listener) {
		let keys = Object.keys(listeners[name]);
		for (let i = keys.length - 1; i >= 0; i--) {
			let func = listener[keys[i]];
			if (func.__once) {
				toRemove.push(func);
			}
			debug && console.log(' - handling ' + keys[i]);
			if (func.apply(listener, args) === exports.stop) {
				debug && console.log(' - stopped by listener');
				break;
			}
		}
	}
	if (name.indexOf('[') >= 0) {
		let wildcardName = name.replace(/\[\d+]/g, '[#]');
		if (wildcardName !== name) {
			fireEvent(wildcardName, data, name);
		}
	}
	if (name.substr(-1) === ')') {
		let wildcardName2 = name.replace(/\([^)]+\)$/, '(*)');
		if (wildcardName2 !== name) {
			fireEvent.apply(exports, [wildcardName2].concat(args));
		}
	}
	if (toRemove.length > 0) {
		for (let j = 0; j < toRemove.length; j++) {
			removeEventListener(name, toRemove[j]);
		}
	}
	return exports;
}

function curryFireEvent(name, data) {
	return () => exports.fireEvent(name, data);
}

function removeEventListener(name, func) {
	let listener = listeners[name];
	if (listener) {
		for (let i = 0; i < listener.length; i++) {
			if (listener[i] === func) {
				listener.splice(i, 1);
				break;
			}
		}
	}
	return exports;
}

function curryRemoveEventListener(name, func) {
	return () => exports.removeEventListener(name, func);
}

function removeAllEventListeners() {
	listeners = null;
	return exports;
}

function once(name, func) {
	func.__once = true;
	return addEventListener(name, func);
}
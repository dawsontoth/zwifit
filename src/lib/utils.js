let convertBase = require('./convertBase');

/*
 Public API.
 */
exports.bufferHelper = bufferHelper;
exports.convertFlags = convertFlags;
exports.convertElapsedToNanoseconds = convertElapsedToNanoseconds;
exports.convertElapsedToSeconds = convertElapsedToSeconds;

/*
 Implementation.
 */

function bufferHelper() {
	let parts = [],
		at = 0,
		self = {
			write: (size, data, signed, bigEndian) => {
				parts.push([at, size, data, signed, bigEndian]);
				at += size / 8;
				return self;
			},
			finish: () => {
				let buffer = Buffer.alloc(at);
				parts.forEach(part => {
					let [at, size, data, signed, bigEndian] = part;
					try {
						if (signed) {
							if (bigEndian) {
								buffer.writeIntBE(data, at, size / 8);
							}
							else {
								buffer.writeIntLE(data, at, size / 8);
							}
						}
						else {
							if (bigEndian) {
								buffer.writeUIntBE(data, at, size / 8);
							}
							else {
								buffer.writeUIntLE(data, at, size / 8);
							}
						}
					}
					catch (err) {
						console.error(part);
						console.error(parts);
						console.error(err);
					}
				});
				return buffer;
			}
		};
	return self;
}

function convertFlags(flags) {
	return convertBase
		.bin2dec(
			Object
				.values(flags)
				.map(v => v ? '1' : '0')
				.reverse()
				.join('')
		);
}

function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * 1e9 + elapsed[1];
}

function convertElapsedToSeconds(elapsed) {
	return convertElapsedToNanoseconds(elapsed) / 1e9;
}

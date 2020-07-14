const rewire = require('rewire');
const request = rewire('../../../src/ble/ifit/_request');

test('parseBitMap', () => {

	const buf = Buffer.from('80084000000000000000000080', 'hex');
	
	const result = [];
	
	let pos = 0;
	while (pos < buf.length) {
		const v = buf[pos];
		const base = pos * 8;
		for (let i = 0; i < 8; ++i) {
			const mask = 1 << i;
			if (v & mask) {
				result.push(base + i);
			}
		}
		++pos;
	}

	console.log(result);
	
});

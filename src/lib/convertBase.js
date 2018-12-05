function ConvertBase(num) {
	return {
		from: baseFrom => ({
			to: baseTo => {
				if (num < 0) {
					num = 0xFFFFFFFF + num + 1;
				}
				return parseInt(num, baseFrom).toString(baseTo);
			}
		})
	};
}

ConvertBase.bin2dec = num => ConvertBase(num).from(2).to(10);
ConvertBase.bin2hex = num => ConvertBase(num).from(2).to(16);
ConvertBase.dec2bin = num => ConvertBase(num).from(10).to(2);
ConvertBase.dec2hex = num => ConvertBase(num).from(10).to(16);
ConvertBase.hex2bin = num => ConvertBase(num).from(16).to(2);
ConvertBase.hex2dec = num => ConvertBase(num).from(16).to(10);

module.exports = ConvertBase;
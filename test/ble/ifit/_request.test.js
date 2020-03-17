const rewire = require('rewire');
const request = rewire('../../../src/ble/ifit/_request');
const Constants = require('../../../src/ble/ifit/_constants');

const TestEquipment = {
	equipment: Constants.SportsEquipment.Treadmill,
	characteristics: {
		[Constants.Characteristic.Kph.id]: Constants.Characteristic.Kph,
		[Constants.Characteristic.Incline.id]: Constants.Characteristic.Incline,
		[Constants.Characteristic.AverageIncline.id]: Constants.Characteristic.AverageIncline,
		[Constants.Characteristic.CurrentKph.id]: Constants.Characteristic.CurrentKph,
		[Constants.Characteristic.Calories.id]: Constants.Characteristic.Calories,
		[Constants.Characteristic.MaxIncline.id]: Constants.Characteristic.MaxIncline,
		[Constants.Characteristic.MinIncline.id]: Constants.Characteristic.MinIncline,
		[Constants.Characteristic.MaxKph.id]: Constants.Characteristic.MaxKph,
		[Constants.Characteristic.MinKph.id]: Constants.Characteristic.MinKph,
		[Constants.Characteristic.MaxPulse.id]: Constants.Characteristic.MaxPulse,
	}
};

test('parseWriteAndReadResponse', () => {
	
	const reads = [
		Constants.Characteristic.MaxIncline,
		Constants.Characteristic.MinIncline,
		Constants.Characteristic.MaxKph,
		Constants.Characteristic.MinKph,
		Constants.Characteristic.MaxPulse,
	];
	
	const parseWriteAndReadResponse = request.__get__('parseWriteAndReadResponse');
	
	expect(parseWriteAndReadResponse(TestEquipment,
			Buffer.from('0104021004100202e8030000d00764000038', 'hex'),
			reads,
			undefined
		))
			.toEqual({ MaxIncline: 10, MaxKph: 20, MaxPulse: 0, MinIncline: 0, MinKph: 1 });
	
});

test('getBitMap', () => {

	const getBitMap = request.__get__('getBitMap');

	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.Kph,
			value: 0.2
		}]))
			.toEqual([1, 1]);

	// filter unsupported equipments
	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.Kph,
			value: 0.2
		}, {
			characteristic: Constants.Characteristic.Volume,
			value: 0.2
		}]))
			.toEqual([1, 1]);
	
	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.Incline,
			value: 0.2
		}]))
			.toEqual([1, 2]);

	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.CurrentKph,
			value: 0.2
		}]))
			.toEqual([3, 0, 0, 1]);

	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.AverageIncline,
			value: 0.2
		}]))
			.toEqual([7, 0, 0, 0, 0, 0, 0, 16]);

	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.CurrentKph,
			value: 0.2
		}, {
			characteristic: Constants.Characteristic.AverageIncline,
			value: 0.2
		}]))
			.toEqual([7, 0, 0, 1, 0, 0, 0, 16]);

	expect(getBitMap(TestEquipment, [{
			characteristic: Constants.Characteristic.CurrentKph,
			value: 0.2
		}, {
			characteristic: Constants.Characteristic.Calories,
			value: 0.02
		}, {
			characteristic: Constants.Characteristic.AverageIncline,
			value: 0.2
		}]))
			.toEqual([7, 0, 32, 1, 0, 0, 0, 16]);
});

test('parseEquipmentInformationResponse', () => {
	
	const parseEquipmentInformationResponse = request.__get__('parseEquipmentInformationResponse');
	
	const result = parseEquipmentInformationResponse(
			Buffer.from('0104021c041c810250010000000000000ed3fefbdbfcfb3b0ce71f00c0d3189b', 'hex'));
	expect(Object.keys(result.characteristics).length).toBe(24);
	
});

test('parseCommandHeader', () => {
	
	const parseCommandHeader = request.__get__('parseCommandHeader');
	const Commands = request.__get__('Commands');
	
	expect(parseCommandHeader(
				Buffer.from('0104021c041c810250000000000000000ed3fefbdbfcfb3b0ce71f00c0d31899', 'hex'),
				Commands.EquipmentInformation))
			.toEqual({
				equipment: Constants.SportsEquipment.Treadmill
			});

	expect(parseCommandHeader(
				Buffer.from('0104021c041c810250000000000000000ed3fefbdbfcfb3b0ce71e', 'hex'),
				Commands.EquipmentInformation))
			.toEqual({
				error: 'Buffer length is 27 but header says it has to be 32 bytes!'
			});

	expect(parseCommandHeader(
				Buffer.from('0104021c041c810050000000000000000ed3fefbdbfcfb3b0ce71f00c0d31896', 'hex'),
				Commands.EquipmentInformation))
			.toEqual({
				error: 'Response code not OK: 0!'
			});

	expect(parseCommandHeader(
				Buffer.from('0104021c041c800250000000000000000ed3fefbdbfcfb3b0ce71f00c0d31899', 'hex'),
				Commands.EquipmentInformation))
			.toEqual({
				error: 'Expected command 129 but got 128!'
			});
	
});

test('fillResponse', () => {
	
	const fillResponse = request.__get__('fillResponse');
	
	expect(fillResponse(
				Buffer.alloc(17),
				1,
				Buffer.from('ff01630000000000000000000000000000000000', 'hex')))
			.toEqual(Buffer.from('6300000000000000000000000000000000', 'hex'));

	expect(fillResponse(
				Buffer.alloc(18),
				1,
				Buffer.from('ff12616263646566676861626364656667686162', 'hex')))
			.toEqual(Buffer.from('616263646566676861626364656667686162', 'hex'));

	expect(fillResponse(
				Buffer.alloc(19),
				2,
				Buffer.from('0012616263646566676861626364656667686162', 'hex')))
			.toEqual(Buffer.from('61626364656667686162636465666768616200', 'hex'));

	expect(fillResponse(
				Buffer.alloc(19),
				2,
				Buffer.from('ff01630000000000000000000000000000000000', 'hex')))
			.toEqual(Buffer.from('00000000000000000000000000000000000063', 'hex'));

	expect(fillResponse(
				Buffer.alloc(40),
				3,
				Buffer.from('0112616263646566676861626364656667686162', 'hex')))
			.toEqual(Buffer.from('00000000000000000000000000000000000061626364656667686162636465666768616200000000', 'hex'));

});

test('getHeaderFromResponse', () => {
	
	const getHeaderFromResponse = request.__get__('getHeaderFromResponse');
	
	expect(getHeaderFromResponse(Buffer.alloc(0)))
			.toEqual({ error: 'unexpected message format - four bytes expected at least' });

	expect(getHeaderFromResponse(Buffer.from('fe020001', 'hex')))
			.toEqual({
				upcomingMessages: 0,
				buffer: Buffer.from('', 'hex')
			});
			
	expect(getHeaderFromResponse(Buffer.from('fe02230361626364656667686162636465666768', 'hex')))
			.toEqual({
				upcomingMessages: 2,
				buffer: Buffer.from('0000000000000000000000000000000000000000000000000000000000000000000000', 'hex')
			});

	expect(getHeaderFromResponse(Buffer.from('fe02100161626364656667686162636465666768', 'hex')))
			.toEqual({
				upcomingMessages: 0,
				buffer: Buffer.from('00000000000000000000000000000000', 'hex')
			});

	expect(getHeaderFromResponse(Buffer.from('fe02110261626364656667686162636465666768', 'hex')))
			.toEqual({
				upcomingMessages: 1,
				buffer: Buffer.from('0000000000000000000000000000000000', 'hex')
			});
	
});

test('buildWriteMessages', () => {
	
	const buildWriteMessages = request.__get__('buildWriteMessages');
	
	expect(buildWriteMessages(Buffer.alloc(0)))
			.toEqual([
				Buffer.from('fe020001', 'hex')]);

	expect(buildWriteMessages(Buffer.alloc(8, 'abcdefgh')))
			.toEqual([
				Buffer.from('fe020802', 'hex'),
				Buffer.from('ff08616263646566676800000000000000000000', 'hex')]);

	expect(buildWriteMessages(Buffer.alloc(17, 'abcdefgh')))
			.toEqual([
				Buffer.from('fe021102', 'hex'),
				Buffer.from('ff11616263646566676861626364656667686100', 'hex')]);

	expect(buildWriteMessages(Buffer.alloc(18, 'abcdefgh')))
			.toEqual([
				Buffer.from('fe021202', 'hex'),
				Buffer.from('ff12616263646566676861626364656667686162', 'hex')]);

	expect(buildWriteMessages(Buffer.alloc(19, 'abcdefgh')))
			.toEqual([
				Buffer.from('fe021303', 'hex'),
				Buffer.from('0012616263646566676861626364656667686162', 'hex'),
				Buffer.from('ff01630000000000000000000000000000000000', 'hex')]);

	expect(buildWriteMessages(Buffer.alloc(20, 'abcdefgh')))
			.toEqual([
				Buffer.from('fe021403', 'hex'),
				Buffer.from('0012616263646566676861626364656667686162', 'hex'),
				Buffer.from('ff02636400000000000000000000000000000000', 'hex')]);

	expect(buildWriteMessages(Buffer.alloc(40, 'abcdefgh')))
			.toEqual([
				Buffer.from('fe022804', 'hex'),
				Buffer.from('0012616263646566676861626364656667686162', 'hex'),
				Buffer.from('0112636465666768616263646566676861626364', 'hex'),
				Buffer.from('ff04656667680000000000000000000000000000', 'hex')]);
	
});

test('buildRequest', () => {

	const buildRequest = request.__get__('buildRequest');
	const Commands = request.__get__('Commands');
	
	expect(buildRequest(Constants.SportsEquipment.General, Commands.EquipmentInformation).toString('hex'))
			.toBe('0204020402048187');

	expect(buildRequest(Constants.SportsEquipment.Treadmill, Commands.SupportedCapabilities).toString('hex'))
			.toBe('0204020404048088');

	expect(buildRequest(Constants.SportsEquipment.Treadmill, Commands.SupportedCommands).toString('hex'))
			.toBe('0204020404048890');
	
});

test('requestHeader', () => {
	
	const requestHeader = request.__get__('requestHeader');
	
	expect(requestHeader(Buffer.alloc(0), 0).toString('hex'))
			.toBe('fe020001');

	expect(requestHeader(Buffer.alloc(4), 1).toString('hex'))
			.toBe('fe020402');

	expect(requestHeader(Buffer.alloc(19), 2).toString('hex'))
			.toBe('fe021303');
	
});

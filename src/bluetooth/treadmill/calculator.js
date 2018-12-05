let utils = require('../../lib/utils');

let metersPerMile = 1609.344,
	metersPerKilometer = 1000,
	secondsPerHour = 3600;

exports.calculateBuffer = calculateBuffer;

// console.log((calculateBuffer({
// 	mph: 6,
// 	incline: 3
// }).toString('hex')));

function calculateBuffer(args) {
	let mph = args.mph,
		incline = args.incline;

	let metersPerSecond = mph ? mph / secondsPerHour * metersPerMile : 0,
		kilometersPerHour = metersPerSecond ? metersPerSecond / metersPerKilometer * secondsPerHour : 0,
		kilometersPerHourRounded = Math.round(kilometersPerHour * 100),
		inclineRounded = Math.round(incline * 10),
		degrees = incline ? (Math.atan(incline / 100) * 180 / Math.PI) : 0,
		degreesRounded = Math.round(degrees * 10),
		flags = {
			InstantaneousSpeed: false,
			AverageSpeedPresent: false,
			TotalDistancePresent: false,
			InclinationAndRampAngleSettingPresent: true,
			ElevationGainPresent: false,
			InstantaneousPacePresent: false,
			AveragePacePresent: false,
			ExpendedEnergyPresent: false,
			HeartRatePresent: false,
			MetabolicEquivalentPresent: false,
			ElapsedTimePresent: false,
			RemainingTimePresent: false,
			ForceOnBeltAndPowerOutputPresent: false,
			ReservedForFutureUse1: false,
			ReservedForFutureUse2: false,
			ReservedForFutureUse3: false
		};

	return utils
		.bufferHelper()
		.write(16, utils.convertFlags(flags))
		.write(16, kilometersPerHourRounded)
		.write(16, inclineRounded, true)
		.write(16, degreesRounded, true)
		.finish();
}

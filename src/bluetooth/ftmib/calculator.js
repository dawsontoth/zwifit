let utils = require('../../lib/utils');

exports.calculateBuffer = calculateBuffer;

function calculateBuffer(args) {
	let kph = args.kph,
		power = args.power,
		cadence = args.cadence;	

	let kilometersPerHourRounded = Math.round(kph * 100),
		cadencePerHalfSec = cadence * 2;
		flags = {
			MoreData: true,
			AverageSpeedPresent: true,
			InstantaneousCadencePresent: true,
			AverageCadencePresent: false,
			TotalDistancePresent: false,
			ResistanceLevelPresent: false,
			InstantaneousPowerPresent: true,
			AveragePowerPresent: false,
			ExpendedEnergyPresent: false,
			HeartRatePresent: false,
			MetabolicEquivalentPresent: false,
			ElapsedTimePresent: false,
			RemainingTimePresent: false,
		};

	let buffer = utils
		.bufferHelper()
		.write(16, utils.convertFlags(flags))
		.write(16, kilometersPerHourRounded) 	// uint16 resolution of 0.01
		.write(16, cadencePerHalfSec)			// uint16 1/minute with a resolution of 0.5
		.write(16, power, true);				// sint16 Watts with a resolution of 1

	return buffer.finish();
}

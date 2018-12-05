let utils = require('../../lib/utils');

let metersPerMile = 1609.344;
let secondsPerHour = 3600;
let secondsPerMinute = 60;

exports.calculateBuffer = calculateBuffer;

// console.log(calculateBuffer({ mph: 6, cadence: 172 }).toString('hex'));

function calculateBuffer(args) {
	let mph = args.mph,
		cadence = args.cadence;

	let metersPerSecond = mph ? mph / secondsPerHour * metersPerMile : 0,
		metersPerMinute = metersPerSecond * secondsPerMinute,
		metersPerSecondRounded = Math.round(metersPerSecond * 256),
		stepsPerMinute = Math.round(cadence),
		metersPerStep = (metersPerMinute && stepsPerMinute) ? metersPerMinute / stepsPerMinute : 0,
		metersPerStepRounded = Math.round(metersPerStep * 100),
		flags = {
			InstantaneousStrideLengthPresent: false,
			TotalDistancePresent: false,
			WalkingOrRunningStatusBits: mph >= 5,
			ReservedForFutureUse1: false,
			ReservedForFutureUse2: false,
			ReservedForFutureUse3: false,
			ReservedForFutureUse4: false,
			ReservedForFutureUse5: false
		};

	return utils
		.bufferHelper()
		.write(8, utils.convertFlags(flags))
		.write(16, metersPerSecondRounded)
		.write(8, stepsPerMinute)
		// .write(16, metersPerStepRounded)
		.finish();
}

export class RecordedRoute {
	public id:number;
	public name:string;
	public steps:string;
	public length:string;
	public playing:boolean;

	constructor(r?:any, id?:number) {
		this.id = id;

		if (r) {
			this.name = r.name;
			this.steps = r.steps;
			this.length = r.length;
			this.playing = r.playing;
		}
	}

	public togglePlaying() {
		this.playing = !this.playing;
		// TODO: If we're playing, how do we send commands to the treadmill?
		// TODO: If we're playing, we should stop all others from playing, too.
	}

	public addStep(changes, current, metric) {
		let distance = (Math.round((metric ? current.miles : current.kilometers) * 1000) / 1000) + (metric ? ' Kilometers' : ' Miles'),
			parts = [distance + ': '];
		// metric ? 'kph' : 'mph'
		// if (changes[metric ? 'kph' : 'mph']) {
		// 	parts.push(changes[metric ? 'kph' : 'mph'] + (metric ? ' KPH' : ' MPH'));
		// }
		if (changes['incline']) {
			parts.push(changes['incline'] + '% Incline');
		}
		if (parts.length > 1) {
			let step = parts.shift() + parts.join(', ');
			if (this.steps) {
				this.steps += '\n' + step;
			}
			else {
				this.steps = step;
			}
			this.length = distance;
		}
	}
}
import { Component } from '@angular/core';
import { StepRecorderService } from '../services/stepRecorder';
import { WebsocketService } from '../services/webSocket';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
	constructor(public websocket:WebsocketService,
				public stepRecorder:StepRecorderService) {
	}

	public get speedAmount() {
		if (!this.websocket
			|| !this.websocket.current
			|| !this.websocket.current.bluetooth) {
			return 0;
		}
		return this.websocket.settings.metric
			? this.websocket.current.bluetooth.kph
			: this.websocket.current.bluetooth.mph;
	}

	public get speedUnit() {
		return this.websocket.settings.metric ? 'KPH' : 'MPH';
	}

	public get otherSpeedAmount() {
		if (!this.websocket
			|| !this.websocket.current
			|| !this.websocket.current.bluetooth) {
			return 0;
		}
		return !this.websocket.settings.metric
			? this.websocket.current.bluetooth.kph
			: this.websocket.current.bluetooth.mph;
	}

	public get otherSpeedUnit() {
		return !this.websocket.settings.metric ? 'KPH' : 'MPH';
	}

	public get paceAmount() {
		if (!this.websocket
			|| !this.websocket.current
			|| !this.websocket.current.bluetooth) {
			return '-:--';
		}
		let perHour = this.websocket.settings.metric
			? this.websocket.current.bluetooth.kph
			: this.websocket.current.bluetooth.mph,
			pace = 60 / perHour,
			minutes = pace | 0,
			seconds:string | number = (((pace % minutes) || 0) * 60) | 0;
		if (seconds < 10) {
			seconds = '0' + seconds;
		}
		return minutes + ':' + seconds;
	}

	public get paceUnit() {
		return this.websocket.settings.metric ? 'min/km' : 'min/mi';
	}

}

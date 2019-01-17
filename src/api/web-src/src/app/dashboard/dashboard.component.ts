import { Component } from '@angular/core';
import { StepRecorderService } from '../services/stepRecorder';
import { WebsocketService } from '../services/webSocket';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
	public isFullScreen = false;

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

	public toggleFullScreen() {
		this.isFullScreen = !this.isFullScreen;

		let elem = document.documentElement;
		if (this.isFullScreen) {
			if (elem.requestFullscreen) {
				elem.requestFullscreen();
			}
		}
		else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	}

}

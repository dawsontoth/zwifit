import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { StepRecorderService } from './services/stepRecorder';
import { WebsocketService } from './services/webSocket';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
	public isFullScreen = false;
	private statusSubscription:Subscription;

	constructor(public stepRecorder:StepRecorderService,
				public websocket:WebsocketService) {
		this.websocket.connect();
	}

	public ngOnInit() {
	}

	public ngOnDestroy() {
		if (this.statusSubscription) {
			this.statusSubscription.unsubscribe();
		}
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

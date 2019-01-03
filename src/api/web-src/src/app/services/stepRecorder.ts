import { Injectable } from '@angular/core';
import { RecordedRoute } from '../models/recordedRoute';
import { WebSocketEvents, WebsocketService } from './webSocket';

@Injectable()
export class StepRecorderService {
	public recording = false;
	public route:RecordedRoute;

	constructor(websocket:WebsocketService) {
		websocket
			.on(WebSocketEvents.Change)
			.subscribe(changes => {
				if (this.recording && this.route) {
					this.route.addStep(changes, websocket.current.bluetooth, websocket.settings.metric);
				}
			});
	}

}
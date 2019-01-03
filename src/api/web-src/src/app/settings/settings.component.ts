import { Component } from '@angular/core';
import { WebSocketEvents, WebsocketService } from '../services/webSocket';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {

	public changesSaved:any;

	constructor(public websocket:WebsocketService) {
	}

	public get unit() {
		return this.websocket.settings.metric ? 'kilometers' : 'miles';
	}

	public set unit(val:string) {
		this.websocket.settings.metric = val === 'kilometers';
		this.saveChanges();
	}

	public saveChanges() {
		this.websocket.send(WebSocketEvents.WriteSettings, this.websocket.settings);
		if (this.changesSaved) {
			clearTimeout(this.changesSaved);
		}
		this.changesSaved = setTimeout(() => this.changesSaved = null, 2000);
	}

}

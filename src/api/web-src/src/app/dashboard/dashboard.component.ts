import { Component, OnInit } from '@angular/core';
import { WebsocketService } from '../services/webSocket';

@Component({
	selector: 'app-dashboard',
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

	constructor(public websocket:WebsocketService) {
	}

	ngOnInit() {
	}

}

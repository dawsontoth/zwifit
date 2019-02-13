import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { RecordedRoute } from '../models/recordedRoute';
import { WebSocketEvents, WebsocketService } from '../services/webSocket';

@Component({
	selector: 'app-routes',
	templateUrl: './routes.component.html',
	styleUrls: ['./routes.component.scss']
})
export class RoutesComponent implements OnInit, OnDestroy {
	public routes:RecordedRoute[];
	private subscription:Subscription;

	/*
	 Lifecycle.
	 */

	constructor(public websocket:WebsocketService) {
	}

	public ngOnInit() {
		this.updateRoutes();
		this.subscription = this.websocket
			.on(WebSocketEvents.ReadRoutes)
			.subscribe(changes => this.updateRoutes());
	}

	public ngOnDestroy() {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
	}

	/*
	 View.
	 */

	public deleteRoute(route:RecordedRoute) {
		let index = this.routes.indexOf(route);
		let routes = this.websocket.routes;
		if (!routes) {
			routes = [];
		}
		if (index >= 0) {
			routes.splice(index, 1);
			this.routes.splice(index, 1);
			this.websocket.routes = routes;
			this.websocket.send(WebSocketEvents.WriteRoutes, this.websocket.routes);
		}
	}

	/*
	 Utility.
	 */

	private updateRoutes() {
		this.routes = this.websocket.routes.map((r, i) => new RecordedRoute(r, i));
	}

}

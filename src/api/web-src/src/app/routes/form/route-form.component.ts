import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecordedRoute } from '../../models/recordedRoute';
import { StepRecorderService } from '../../services/stepRecorder';
import { WebSocketEvents, WebsocketService } from '../../services/webSocket';

@Component({
	selector: 'app-route-form',
	templateUrl: './route-form.component.html',
	styleUrls: ['./route-form.component.scss']
})
export class RouteFormComponent implements OnInit, OnDestroy {
	public route:RecordedRoute = new RecordedRoute();
	public changesSaved:boolean;
	private id:number = null;
	private subscription:Subscription;

	/*
	 Lifecycle.
	 */

	constructor(public stepRecorder:StepRecorderService,
				public websocket:WebsocketService,
				private ngRoute:ActivatedRoute) {
	}

	public ngOnInit() {
		this.ngRoute.params.subscribe(data => {
			if (data.id !== undefined) {
				this.id = +data.id;
				this.loadRoute();
				this.subscription = this.websocket
					.on(WebSocketEvents.ReadRoutes)
					.subscribe(changes => this.loadRoute());
			}
			else {
				this.route = new RecordedRoute();
			}
		});
	}

	public ngOnDestroy() {
		if (this.subscription) {
			this.subscription.unsubscribe();
		}
	}

	/*
	 View.
	 */

	public get stepLines():number {
		return this.route.steps
			? this.route.steps.split('\n').length
			: 1;
	}

	public toggleRecording() {
		this.stepRecorder.recording = !this.stepRecorder.recording;
		this.stepRecorder.route = this.stepRecorder.recording ? this.route : null;
	}

	public saveChanges() {
		let routes = this.websocket.routes;
		if (!routes) {
			routes = [];
		}
		if (!this.route.id) {
			this.route.id = routes.length;
			routes[this.route.id] = this.route;
		}
		if (this.stepRecorder.recording) {
			this.stepRecorder.recording = false;
		}
		this.websocket.routes = routes;
		this.websocket.send(WebSocketEvents.WriteRoutes, this.websocket.routes);
		this.changesSaved = true;
		setTimeout(() => this.changesSaved = false, 1000);
	}

	/*
	 Utility.
	 */

	private loadRoute() {
		if (this.websocket.routes && this.id !== null) {
			let route = this.websocket.routes.find(r => r.id === this.id);
			if (route) {
				this.route = new RecordedRoute(route, this.id);
			}
		}
	}

}

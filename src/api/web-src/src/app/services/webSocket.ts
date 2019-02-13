import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as io from 'socket.io-client';
import { ICurrentState } from '../models/currentState';

export enum WebSocketEvents {
	Change = 'change',
	Current = 'current',
	ReadSettings = 'readSettings',
	WriteSettings = 'writeSettings',
	ReadRoutes = 'readRoutes',
	WriteRoutes = 'writeRoutes',
	Control = 'control'
}

@Injectable()
export class WebsocketService {
	public current:ICurrentState = {};
	public settings = {
		ip: '',
		metric: false,
		speedOffset: 0,
		speedMultiplier: 1,
		broadcastRSC: false,
		broadcastFTMS: true
	};
	public routes:any[] = [];
	private socket;
	private subjects:{ [key:string]:Subject<any> } = {};

	constructor(private ngZone:NgZone) {
	}

	/*
	 Public API.
	 */

	public connect() {
		this.ngZone.runOutsideAngular(() => {
			this.socket = io(location.hostname + ':1337');
			this.socket.on('message', message => this.handleMessage(message));
		});
	}

	public disconnect() {
		if (this.socket) {
			this.socket.disconnect();
		}
	}

	public send<T>(event:WebSocketEvents, data:T) {
		if (this.socket) {
			this.socket.emit('message', JSON.stringify({ event, data }));
		}
	}

	public on<T>(event:WebSocketEvents):Observable<T> {
		if (!this.subjects[event]) {
			this.subjects[event] = new Subject();
		}
		return this.subjects[event];
	}

	/*
	 Utility.
	 */

	private handleMessage(message) {
		if (!message) {
			return;
		}
		let event = message.event;

		this.ngZone.run(() => {
			switch (event) {
				case WebSocketEvents.Current:
					this.current = message.data;
					break;
				case WebSocketEvents.ReadSettings:
					this.settings = message.data;
					break;
				case WebSocketEvents.ReadRoutes:
					this.routes = message.data;
					break;
			}

			if (this.subjects[event]) {
				this.subjects[event].next(message.data);
			}
		});
	}

}
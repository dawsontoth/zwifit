import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as io from 'socket.io-client';
import { ICurrentState } from '../models/currentState';

export enum WebSocketEvents {
	Change = 'change',
	Current = 'current',
	ReadSettings = 'readSettings',
	WriteSettings = 'writeSettings',
	Control = 'control'
}

@Injectable()
export class WebsocketService {
	public current:ICurrentState = {};
	public settings = { ip: '', metric: false };
	private socket;
	private subjects:{ [key:string]:Subject<any> } = {};

	public connect() {
		this.socket = io(location.hostname + ':1337');
		this.socket.on('message', message => {
			if (!message) {
				return;
			}
			let event = message.event;

			switch (event) {
				case WebSocketEvents.Current:
					this.current = message.data;
					break;
				case WebSocketEvents.ReadSettings:
					this.settings = message.data;
					break;
			}

			if (this.subjects[event]) {
				this.subjects[event].next(message.data);
			}
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

}
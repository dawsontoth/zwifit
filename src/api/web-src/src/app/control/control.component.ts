import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WebSocketEvents, WebsocketService } from '../services/webSocket';

@Component({
	selector: 'app-control',
	templateUrl: './control.component.html',
	styleUrls: ['./control.component.scss']
})
export class ControlComponent implements OnInit, OnDestroy {
	public entry:number = null;
	public unit:string;
	public buttons = [
		'7', '8', '9',
		'4', '5', '6',
		'1', '2', '3',
		'-', '0', '.',
		'Cancel', 'Go'
	];
	public metric:string;
	private rawEntry:string = '';
	private params:Subscription;

	constructor(private route:ActivatedRoute,
				private router:Router,
				private websocket:WebsocketService) {
	}

	public ngOnInit() {
		this.params = this.route.params.subscribe(params => {
			this.metric = this.route.snapshot.paramMap.get('metric');
			this.entry = null;
			this.rawEntry = '';
			switch (this.metric) {
				case 'speed':
					this.unit = this.websocket.settings.metric ? ' KPH' : ' MPH';
					break;
				case 'incline':
					this.unit = '%';
					break;
				case 'cadence':
					this.unit = ' SPM';
					break;
			}
		});
	}

	@HostListener('window:keydown', ['$event'])
	private handleKeyDown(evt:any) {
		switch (evt.key) {
			case 's':
				this.router.navigate(['/control/speed']);
				break;
			case 'i':
				this.router.navigate(['/control/incline']);
				break;
			case 'c':
				this.router.navigate(['/control/cadence']);
				break;
			case 'ArrowUp':
			case 'ArrowRight':
				this.adjust(0.1);
				break;
			case 'ArrowDown':
			case 'ArrowLeft':
				this.adjust(-0.1);
				break;
			case '-':
			case '1':
			case '2':
			case '3':
			case '4':
			case '5':
			case '6':
			case '7':
			case '8':
			case '9':
			case '0':
			case '.':
				this.clicked(evt.key);
				break;
			case 'Escape':
				this.clicked(('Cancel'));
				break;
			case 'Enter':
			case 'Return':
			case 'Space':
				this.clicked(('Go'));
				break;
			default:
				return true;
		}
		evt.preventDefault();
		return false;
	}

	public ngOnDestroy() {
		if (this.params) {
			this.params.unsubscribe();
		}
	}

	public adjust(by:number) {
		let data = {};
		let currentStatus = this.websocket.current.bluetooth;
		switch (this.metric) {
			case 'speed':
				let metric = this.websocket.settings.metric,
					currentSpeed = metric ? currentStatus.kph : currentStatus.mph;
				data[metric ? 'kph' : 'mph'] = Math.min(Math.max(currentSpeed + by, 0), 30);
				break;
			case 'incline':
				data['incline'] = Math.max(Math.min(currentStatus.incline + by, 40), -10);
				break;
			case 'cadence':
				data['cadence'] = Math.min(Math.max(currentStatus.cadence + by, 0), 200);
				break;
		}
		this.websocket.send(WebSocketEvents.Control, data);
	}

	public clicked(button:string) {
		switch (button) {
			case 'Cancel':
				this.rawEntry = '';
				break;
			case 'Go':
				if (this.entry === null) {
					return;
				}
				let data = {};
				switch (this.metric) {
					case 'speed':
						data[this.websocket.settings.metric ? 'kph' : 'mph'] = Math.min(Math.abs(this.entry), 30);
						break;
					case 'incline':
						data['incline'] = Math.max(Math.min(this.entry, 40), -10);
						break;
					case 'cadence':
						data['cadence'] = Math.min(Math.abs(this.entry), 200);
						break;
				}
				this.websocket.send(WebSocketEvents.Control, data);
				this.rawEntry = '';
				break;
			default:
				this.rawEntry += button;
				break;
		}
		if (this.rawEntry === '') {
			this.entry = null;
		}
		else {
			this.entry = parseFloat(this.rawEntry);
			if (isNaN(this.entry)) {
				this.entry = null;
			}
		}
	}
}

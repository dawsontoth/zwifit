import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WebsocketService } from './services/webSocket';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
	private statusSubscription:Subscription;

	constructor(public websocket:WebsocketService,
				private router:Router) {
		this.websocket.connect();
	}

	public ngOnInit() {
	}

	public ngOnDestroy() {
		if (this.statusSubscription) {
			this.statusSubscription.unsubscribe();
		}
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
			case 'Escape':
				this.router.navigate(['/']);
				break;
			default:
				return true;
		}
		evt.preventDefault();
		return false;
	}
}

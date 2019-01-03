import { Component, OnInit } from '@angular/core';
import { RecordedRoute } from '../../models/recordedRoute';
import { StepRecorderService } from '../../services/stepRecorder';

@Component({
	selector: 'app-route-form',
	templateUrl: './route-form.component.html',
	styleUrls: ['./route-form.component.scss']
})
export class RouteFormComponent implements OnInit {
	public route:RecordedRoute;

	constructor(public stepRecorder:StepRecorderService) {
	}

	public ngOnInit() {
		this.route = new RecordedRoute();
	}

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
		// TODO: Save changes.
	}

}

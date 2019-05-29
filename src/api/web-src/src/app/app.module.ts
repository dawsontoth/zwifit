import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ControlComponent } from './control/control.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StatComponent } from './dashboard/stat/stat.component';
import { RouteFormComponent } from './routes/form/route-form.component';
import { RoutesComponent } from './routes/routes.component';
import { StepRecorderService } from './services/stepRecorder';
import { WebsocketService } from './services/webSocket';
import { SettingsComponent } from './settings/settings.component';

@NgModule({
	declarations: [
		AppComponent,
		DashboardComponent,
		SettingsComponent,
		RoutesComponent,
		ControlComponent,
		RouteFormComponent,
		StatComponent,
	],
	imports: [
		BrowserModule,
		FormsModule,
		AppRoutingModule,
	],
	providers: [
		StepRecorderService,
		WebsocketService,
	],
	bootstrap: [AppComponent],
})
export class AppModule {
}

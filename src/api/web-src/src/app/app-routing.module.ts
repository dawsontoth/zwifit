import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControlComponent } from './control/control.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RouteFormComponent } from './routes/form/route-form.component';
import { RoutesComponent } from './routes/routes.component';
import { SettingsComponent } from './settings/settings.component';

const routes:Routes = [
	{ path: '', component: DashboardComponent },
	{ path: 'control/:metric', component: ControlComponent },
	{ path: 'routes', component: RoutesComponent },
	{ path: 'routes/new', component: RouteFormComponent },
	{ path: 'routes/:id', component: RouteFormComponent },
	{ path: 'settings', component: SettingsComponent },
];

@NgModule({
	imports: [ RouterModule.forRoot(routes) ],
	exports: [ RouterModule ]
})
export class AppRoutingModule {
}

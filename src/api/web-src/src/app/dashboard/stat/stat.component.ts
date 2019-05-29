import { Component, Input } from '@angular/core';

@Component({
	selector: '[stat]',
	templateUrl: './stat.component.html',
	styleUrls: ['./stat.component.scss']
})
export class StatComponent {
	@Input() public amount:string;
	@Input() public unit:string;
}

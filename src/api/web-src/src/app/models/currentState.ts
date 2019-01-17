export interface ICurrentState {
	bluetooth?:{
		clients?:string[],
		kph?:number,
		mph?:number,
		incline?:number,
		cadence?:number,
		miles?:number,
		kilometers?:number,
		time?:number
	},
	ifit?:{
		connected?:boolean
		// Plus other parameters
	}
}
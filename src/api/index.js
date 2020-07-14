let express = require('express'),
	path = require('path'),
	app = express(),
	settings = require('../settings'),
	routes = require('../routes'),
	server = require('http').Server(app),
	io = require('socket.io')(server),
	events = require('../lib/events');

exports.start = (bluetooth, ifit) => {
	app.use(express.static(path.join(__dirname, 'web-dist')));

	let current = { bluetooth: bluetooth.current, ifit: ifit.current };

	io.on('connection', socket => {
		socket.on('message', str => {
			let msg = safeParse(str);
			switch (msg && msg.event) {
				case 'control':
					events
						.fire('controlRequested', msg.data)
						.fire('changeReceived', msg.data);
					break;
				case 'writeSettings':
					settings.fromJSON(msg.data);
					settings.save();
					socket.emit('message', { event: 'readSettings', data: settings.toJSON() });
					break;
				case 'writeRoutes':
					routes.fromJSON({ list: msg.data });
					routes.save();
					socket.emit('message', { event: 'readRoutes', data: routes.list });
					break;
				default:
					console.log('Unexpected message received', msg);
			}
		});
		socket.emit('message', { event: 'current', data: current });
		socket.emit('message', { event: 'readSettings', data: settings.toJSON() });
		socket.emit('message', { event: 'readRoutes', data: routes.list });
		// socket.on('disconnect', () => {});
	});

	// setInterval(
	// 	() => io.emit('message', { event: 'current', data: current }),
	// 	1000
	// );
	events.on('changeReceived', changes => {
		io.emit('message', { event: 'change', data: changes });
		io.emit('message', { event: 'current', data: current });
	});

	let port = 1337;
	server.listen(port, () => console.log(`API: Listening at http://localhost:${port}/`));
};

function safeParse(val) {
	try {
		return JSON.parse(val);
	}
	catch (err) {
		return null;
	}
}

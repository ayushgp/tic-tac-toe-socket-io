var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var rooms = 0;

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('.'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/game.html');
});

io.on('connection', function(socket){
	socket.on('createGame', function(data){
		socket.join('room-' + ++rooms);
		socket.emit('newGame', {name: data.name, room: 'room-'+rooms});
	});

	socket.on('joinGame', function(data){
		var room = io.nsps['/'].adapter.rooms[data.room];
		if( room && room.length == 1){
			socket.join(data.room);
			console.log(io.nsps['/'].adapter.rooms[data.room]);
			socket.broadcast.to(data.room).emit('player1', {});
			socket.emit('player2', {name: data.name })
		}
		else {
			socket.emit('err', {message: 'Sorry, The room is full!'});
		}
	});

	socket.on('playTurn', function(data){
		socket.broadcast.to(data.room).emit('turnPlayed', {
			tile: data.tile,
			room: data.room
		});
	});
	socket.on('gameEnded', function(data){
		socket.broadcast.to(data.room).emit('gameEnd', data);
	})
})

server.listen(3000);
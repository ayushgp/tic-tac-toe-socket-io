var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var rooms = 0;

app.use(express.static('.'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/game.html');
});

io.on('connection', function(socket){

	/**
	 * Create a new game room and notify the creator of game. 
	 */
	socket.on('createGame', function(data){
		socket.join('room-' + ++rooms);
		socket.emit('newGame', {name: data.name, room: 'room-'+rooms});
	});

	/**
	 * Connect the Player 2 to the room he requested. Show error if room full.
	 */
	socket.on('joinGame', function(data){
		var room = io.nsps['/'].adapter.rooms[data.room];
		if( room && room.length == 1){
			socket.join(data.room);
			socket.broadcast.to(data.room).emit('player1', {});
			socket.emit('player2', {name: data.name, room: data.room })
		}
		else {
			socket.emit('err', {message: 'Sorry, The room is full!'});
		}
	});

	/**
	 * Handle the turn played by either player and notify the other. 
	 */
	socket.on('playTurn', function(data){
		socket.broadcast.to(data.room).emit('turnPlayed', {
			tile: data.tile,
			room: data.room
		});
	});

	/**
	 * Notify the players about the victor.
	 */
	socket.on('gameEnded', function(data){
		socket.broadcast.to(data.room).emit('gameEnd', data);
	});
})

server.listen(process.env.PORT || 5000);
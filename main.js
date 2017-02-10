
'use strict';
(function() {

	var P1 = 'X', P2 = 'O';
	//Connect to Socket.IO
	var socket = io.connect('http://tic-tac-toe-realtime.herokuapp.com'),
	// var socket = io.connect('http://localhost:5000'),
		player,
		game;

	//Game Class Definition
	
	var Game = function(roomId){
		this.roomId = roomId;
		this.board = [];
		this.moves = 0;
	}

	Game.prototype.getRoomId = function(){
		return this.roomId;
	}

	Game.prototype.displayBoard = function(message){
		$('.menu').css('display', 'none');
		$('.gameBoard').css('display', 'block');
		$('#userHello').html(message);
		this.createGameBoard();
	}

	Game.prototype.createGameBoard = function(){
		for(var i=0; i<3; i++) {
			this.board.push(['','','']);
			for(var j=0; j<3; j++) {
				$('#button_' + i + '' + j).on('click', function(){
					
					//Check for turn
					if(!player.getCurrentTurn()){
						alert('Its not your turn!');
						return;
					}

					//Error on playing same button again.
					if($(this).prop('disabled')){
						alert('This tile has already been played on!');
					}

					//Update board after your turn.
					var row = parseInt(this.id.split('_')[1][0]);
					var col = parseInt(this.id.split('_')[1][1]);
					game.playTurn(this);
					game.updateBoard(player.getPlayerType(), row, col, this.id);

					player.setCurrentTurn(false);
					player.updatePlaysArr(1 << (row * 3 + col));

					game.checkWinner();

					return false;
				});
			}
		}
	}

	Game.prototype.updateBoard = function(type, row, col, tile){
		$('#'+tile).text(type);
		$('#'+tile).prop('disabled', true);
		this.board[row][col] = type;
		this.moves ++;
	}

	Game.prototype.playTurn = function(tile){
		var clickedTile = $(tile).attr('id');
		var turnObj = {
			tile: clickedTile,
			room: this.getRoomId()
		};
		// Emit an event to update other player that you've played your turn.
		socket.emit('playTurn', turnObj);
	}

	Game.prototype.endGame = function(message){
		alert(message);
		location.reload();
	}

	/*
	* To determine a win condition, each square is "tagged" from left
	* to right, top to bottom, with successive powers of 2.  Each cell
	* thus represents an individual bit in a 9-bit string, and a
	* player's squares at any given time can be represented as a
	* unique 9-bit value. A winner can thus be easily determined by
	* checking whether the player's current 9 bits have covered any
	* of the eight "three-in-a-row" combinations.
	*
	*     273                 84
	*        \               /
	*          1 |   2 |   4  = 7
	*       -----+-----+-----
	*          8 |  16 |  32  = 56
	*       -----+-----+-----
	*         64 | 128 | 256  = 448
	*       =================
	*         73   146   292
	*
	*  We have these numbers in the Player.wins array and for the current 
	*  player, we've stored this information in playsArr.
	*/
	Game.prototype.checkWinner = function(){		
		var currentPlayerPositions = player.getPlaysArr();
		Player.wins.forEach(function(winningPosition){
			if(winningPosition & currentPlayerPositions == winningPosition){
				game.announceWinner();
			}
		});

		var tied = this.checkTie();
		if(tied){
			socket.emit('gameEnded', {room: this.getRoomId(), message: 'Game Tied :('});
			alert('Game Tied :(');
			location.reload();	
		}
	}

	Game.prototype.checkTie = function(){
		return this.moves >= 9;
	}

	Game.prototype.announceWinner = function(){
		var message = player.getPlayerName() + ' wins!';
		socket.emit('gameEnded', {room: this.getRoomId(), message: message});
		alert(message);
		location.reload();
	}

	var Player = function(name, type){
		this.name = name;
		this.type = type;
		this.currentTurn = true;
		this.playsArr = 0;
	}

	Player.wins = [7, 56, 448, 73, 146, 292, 273, 84];

	Player.prototype.updatePlaysArr = function(tileValue){
		this.playsArr += tileValue;
	}

	Player.prototype.getPlaysArr = function(tileValue){
		return this.playsArr;
	}

	Player.prototype.setCurrentTurn = function(turn){
		this.currentTurn = turn;
		if(turn)
			$('#turn').text('Your turn.');
		else
			$('#turn').text('Waiting for Opponent');
	}

	Player.prototype.getPlayerName = function(){
		return this.name;
	}

	Player.prototype.getPlayerType = function(){
		return this.type;
	}

	Player.prototype.getCurrentTurn = function(){
		return this.currentTurn;
	}

	//Create a new game.
	$('#new').on('click', function(){
		var name = $('#nameNew').val();
		if(!name){
			alert('Please enter your name.');
			return;
		}
		socket.emit('createGame', {name: name});
		player = new Player(name, P1);
	});

	//Join an existing game
	$('#join').on('click', function(){
		var name = $('#nameJoin').val();
		roomID = $('#room').val();
		if(!name || !roomID){
			alert('Please enter your name and game ID.');
			return;
		}
		socket.emit('joinGame', {name: name, room: roomID});
		player = new Player(name, P2);
	});

	//New Game created. Update UI.
	socket.on('newGame', function(data){

		var message = 'Hello, ' + data.name + 
			'. Please ask your friend to enter Game ID: ' +
			data.room + '. Waiting for player 2...';

		// Create game for player 1
		game = new Game(data.room);
		game.displayBoard(message);		
	});

	//If player creates the game, He is the the host
	socket.on('player1', function(data){		
		var message = 'Hello, ' + player.getPlayerName();

		// Reset the message for the player
		$('#userHello').html(message);
		
		// Set the current player's turn
		player.setCurrentTurn(true);
	});

	//Joined the game, so player is player 2
	socket.on('player2', function(data){
		var message = 'Hello, ' + data.name;
		
		//Create game for player 2
		game = new Game(data.room);
		game.displayBoard(message);
		
		// First turn is of player 1, so set to false
		player.setCurrentTurn(false);	
	});	

	//Opponent played his turn. Update UI.
	socket.on('turnPlayed', function(data){
		var row = data.tile.split('_')[1][0];
		var col = data.tile.split('_')[1][1];
		var opponentType = player.getPlayerType() == P1 ? P2 : P1;
		game.updateBoard(opponentType, row, col, data.tile);
		player.setCurrentTurn(true);
	});

	socket.on('gameEnd', function(data){
		game.endGame(data.message);
	})

	socket.on('err', function(data){
		game.endGame(data.message);
	});
})();
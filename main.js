'use strict';
(function() {

	var P1 = 'X', P2 = 'O';
	// var socket = io.connect('http://tic-tac-toe-realtime.herokuapp.com'),
	var socket = io.connect('http://localhost:5000'),
		player,
		game;

	/**
	 * Game class
	 * 
	 * @param {any} roomId Id of the room in which the game is running on 
	 * the server.
	 */
	var Game = function(roomId){
		this.roomId = roomId;
		this.board = [];
		this.moves = 0;
	}

	/**
	 * Create the Game board by attaching event listeners to the buttons. 
	 */
	Game.prototype.createGameBoard = function(){
		for(var i=0; i<3; i++) {
			this.board.push(['','','']);
			for(var j=0; j<3; j++) {
				$('#button_' + i + '' + j).on('click', function(){
					if(!player.getCurrentTurn()){
						alert('Its not your turn!');
						return;
					}

					if($(this).prop('disabled'))
						alert('This tile has already been played on!');

					var row = parseInt(this.id.split('_')[1][0]);
					var col = parseInt(this.id.split('_')[1][1]);
	
					//Update board after your turn.
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

	/**
	 * Remove the menu from DOM, display the gameboard and greet the player.
	 * 
	 * @param {any} message
	 */
	Game.prototype.displayBoard = function(message){
		$('.menu').css('display', 'none');
		$('.gameBoard').css('display', 'block');
		$('#userHello').html(message);
		this.createGameBoard();
	}
	
	/**
	 * Update game board UI
	 * 
	 * @param {string} type Type of player(X or O)
	 * @param {int} row Row in which move was played
	 * @param {int} col Col in which move was played
	 * @param {string} tile Id of the the that was clicked
	 */
	Game.prototype.updateBoard = function(type, row, col, tile){
		$('#'+tile).text(type);
		$('#'+tile).prop('disabled', true);
		this.board[row][col] = type;
		this.moves ++;
	}
	
	/**
	 * @returns roomId of the current game.
	 */
	Game.prototype.getRoomId = function(){
		return this.roomId;
	}

	/**
	 * Send an update to the opponent to update their UI.
	 * 
	 * @param {any} tile Id of the clicked tile.
	 */
	Game.prototype.playTurn = function(tile){
		var clickedTile = $(tile).attr('id');
		var turnObj = {
			tile: clickedTile,
			room: this.getRoomId()
		};
		// Emit an event to update other player that you've played your turn.
		socket.emit('playTurn', turnObj);
	}

	/**
	 *
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

	/**
	 * Check if game is tied
	 * 
	 * @returns	{boolean} This tells if the game is tied or not.
	 */
	Game.prototype.checkTie = function(){
		return this.moves >= 9;
	}

	/**
	 * Announce the winner if the current client has won. 
	 * Broadcast this on the room to let the opponent know.
	 */
	Game.prototype.announceWinner = function(){
		var message = player.getPlayerName() + ' wins!';
		socket.emit('gameEnded', {room: this.getRoomId(), message: message});
		alert(message);
		location.reload();
	}

	/**
	 * End the game if the other player won.  
	 * 
	 * @param {any} message Print this message to the alert box.
	 */
	Game.prototype.endGame = function(message){
		alert(message);
		location.reload();
	}




	/**
	 * Player class
	 * 
	 * @param {string} name Name of the player
	 * @param {string} type Type of the player
	 */
	var Player = function(name, type){
		this.name = name;
		this.type = type;
		this.currentTurn = true;
		this.playsArr = 0;
	}

	Player.wins = [7, 56, 448, 73, 146, 292, 273, 84];

	/**
	 * Set the bit of the move played by the player
	 * 
	 * @param {int} tileValue Bitmask used to set the recently played move.
	 */
	Player.prototype.updatePlaysArr = function(tileValue){
		this.playsArr += tileValue;
	}

	/**
	 * @returns playsArr for checking the winner
	 */
	Player.prototype.getPlaysArr = function(){
		return this.playsArr;
	}

	/**
	 * 
	 * Set the currentTurn for player to turn and update UI to reflect the same.
	 * @param {boolean} turn Player's turn status
	 */
	Player.prototype.setCurrentTurn = function(turn){
		this.currentTurn = turn;
		if(turn)
			$('#turn').text('Your turn.');
		else
			$('#turn').text('Waiting for Opponent');
	}

	/**
	 * @returns name of the player.
	 */
	Player.prototype.getPlayerName = function(){
		return this.name;
	}

	/**
	 * @returns type of the player (O or X).
	 */
	Player.prototype.getPlayerType = function(){
		return this.type;
	}

	/**
	 * @returns currentTurn to determine if it is the player's turn.
	 */
	Player.prototype.getCurrentTurn = function(){
		return this.currentTurn;
	}

	/**
	 * Create a new game. Emit newGame event.
	 */
	$('#new').on('click', function(){
		var name = $('#nameNew').val();
		if(!name){
			alert('Please enter your name.');
			return;
		}
		socket.emit('createGame', {name: name});
		player = new Player(name, P1);
	});

	/** 
	 *  Join an existing game on the entered roomId. Emit the joinGame event.
	 */ 
	$('#join').on('click', function(){
		var name = $('#nameJoin').val();
		var roomID = $('#room').val();
		if(!name || !roomID){
			alert('Please enter your name and game ID.');
			return;
		}
		socket.emit('joinGame', {name: name, room: roomID});
		player = new Player(name, P2);
	});

	/** 
	 * New Game created by current client. 
	 * Update the UI and create new Game var.
	 */
	socket.on('newGame', function(data){
		var message = 'Hello, ' + data.name + 
			'. Please ask your friend to enter Game ID: ' +
			data.room + '. Waiting for player 2...';

		// Create game for player 1
		game = new Game(data.room);
		game.displayBoard(message);		
	});

	/**
	 * If player creates the game, he'll be P1(X) and has the first turn.
	 * This event is received when opponent connects to the room.
	 */
	socket.on('player1', function(data){		
		var message = 'Hello, ' + player.getPlayerName();
		$('#userHello').html(message);
		player.setCurrentTurn(true);
	});

	/**
	 * Joined the game, so player is P2(O). 
	 * This event is received when P2 successfully joins the game room. 
	 */
	socket.on('player2', function(data){
		var message = 'Hello, ' + data.name;
		
		//Create game for player 2
		game = new Game(data.room);
		game.displayBoard(message);
		player.setCurrentTurn(false);	
	});	

	/**
	 * Opponent played his turn. Update UI.
	 * Allow the current player to play now. 
	 */
	socket.on('turnPlayed', function(data){
		var row = data.tile.split('_')[1][0];
		var col = data.tile.split('_')[1][1];
		var opponentType = player.getPlayerType() == P1 ? P2 : P1;
		game.updateBoard(opponentType, row, col, data.tile);
		player.setCurrentTurn(true);
	});

	/**
	 * If the other player wins, this event is received. Notify the user to 
	 */
	socket.on('gameEnd', function(data){
		game.endGame(data.message);
		socket.leave(data.room);
	})

	/**
	 * End the game on any err event. 
	 */
	socket.on('err', function(data){
		game.endGame(data.message);
	});
})();
(function() {

	var P1 = 'X', P2 = 'O';
	//Connect to Socket.IO
	var socket = io.connect('http://localhost:3000');
	var currentTurn;
	var playerType;
	var roomID;
	var board = [];

	//Create a new game.
	$('#new').on('click', function(){
		var name = $('#nameNew').val();
		if(!name){
			alert('Please enter your name.');
			return;
		}
		socket.emit('createGame', {name: name});
		playerType = P1;
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
		playerType = P2;
	});

	//Created the game, so player is player 1
	socket.on('player1', function(data){
		$('.menu').css('display', 'none');
		$('.gameBoard').css('display', 'block');
		$('#joinMessage').remove();
		currentTurn = true;
		$('#turn').text('Your turn.');
	});	

	//Joined the game, so player is player 2
	socket.on('player2', function(data){
		$('.menu').css('display', 'none');
		$('.gameBoard').css('display', 'block');
		$('#userHello').text('Hello, ' + data.name);
		currentTurn = false;
		$('#turn').text('Waiting for Opponent');
	});	

	//New Game created. Update UI.
	socket.on('newGame', function(data){
		roomID = data.room;
		$('.menu').css('display', 'none');
		$('.gameBoard').css('display', 'block');
		$('#userHello').html('Hello, ' + data.name + 
			'. <span id="joinMessage">Please ask your friend to enter Game ID: ' +
			data.room + '. Waiting for player 2...</span>');
	});

	//Opponent played his turn. Update UI.
	socket.on('turnPlayed', function(data){
		var opponentType = playerType == P1 ? P2 : P1;
		$('#'+data.tile).text(opponentType);
		$('#'+data.tile).prop('disabled', true);
		var row = data.tile.split('_')[1][0];
		var col = data.tile.split('_')[1][1];
		board[row][col] = opponentType;
		currentTurn = true;
		$('#turn').text('Your turn.');
	});

	socket.on('gameEnd', function(data){
		alert(data.message);
		location.reload();
	})

	socket.on('err', function(data){
		alert(data.message);
		location.reload();
	});
	/*
		Create the table which will contain buttons for  our game
	*/
	

	for(var i=0; i<3; i++) {
		board.push(['','','']);
		for(var j=0; j<3; j++) {
			$('#button_' + i + '' + j).on('click', function(){
				//Check for turn
				if(!currentTurn){
					alert('Its not your turn!');
					return;
				}

				//Error on playing same button again.
				if($(this).prop('disabled')){
					alert('This tile has already been played on!');
				}

				//Update board after your turn.
				$(this).text(playerType);
				$(this).prop('disabled', true);
				var tile = $(this).attr('id');
				var turnObj = {
					tile: tile,
					room: roomID
				};
				//Emit an event to other player that you've played your turn.
				socket.emit('playTurn', turnObj);
				var row = tile.split('_')[1][0];
				var col = tile.split('_')[1][1];
				board[row][col] = playerType;
				checkWinner();
				currentTurn = false;
				$('#turn').text('Waiting for Opponent');
			});
		}
	}

	function checkWinner(){
		for(var i = 0; i < 3; i++){
			if(board[i][0] == playerType && 
				board[i][1] == playerType && 
				board[i][2] == playerType )	{
					announceWinner();
					return;
			}
			else if(board[0][i] == playerType && 
				board[1][i] == playerType && 
				board[2][i] == playerType) {
					announceWinner();
					return;
			}
		}
		if(board[0][0] == playerType && 
			board[1][1] == playerType && 
			board[2][2] == playerType)
			announceWinner();
		else if(board[2][0] == playerType && 
			board[1][1] == playerType && 
			board[0][2] == playerType)
			announceWinner();
		var tied = checkTie();
		if(tied){
			socket.emit('gameEnded', {room: roomID, message: 'Game Tied :('});
			alert('Game Tied :(');
			location.reload();	
		}
	}

	function checkTie(){
		for(var i = 0; i < 3; i++){
			for(var j = 0; j < 3; j++){
				if(board[i][j] == ''){
					return false;
				}
			}	
		}
		return true;
	}

	function announceWinner(){
		socket.emit('gameEnded', {room: roomID, message: 'Player ' + playerType + ' wins!'});
		alert('Player ' + playerType + ' wins!');
		location.reload();
	}
})();
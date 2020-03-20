// Node WebRTC

var http = require("http"); // Should be HTTPS because Chrome does not share screen on HTTP
var url = require("url");
var fs = require("fs");
var util = require("util");

var port = process.env.PORT || 3000;

// HTTPS Web Server

// var httpsoptions = {
	// key: fs.readFileSync('server.key'),
	// cert: fs.readFileSync('server.crt')
// };

var webServer = http.createServer(function (request, response) {

  var req = url.parse(request.url, true);
	var path = req.path; console.log(JSON.stringify(req));

	if (path == '/') {
		console.log('Index accessed.');
		fs.readFile('./client/index.html', function(err, html) {
			if (err) {
				console.log(err);
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(html);
				response.end();
			}
		});
		
	} else if (path == '/client.js') {
		console.log('Client accesed.');
		fs.readFile('./client/client.js', function (err, js) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200, {"Content-Type": 'text/javascript'});
				response.write(js);
				response.end();
			}
		});
		
	} else if (path == '/style.css') {
		fs.readFile('./client/style.css', function (err, css) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200, {"Content-Type": 'text/css'});
				response.write(css);
				response.end();
			}
		});
		
	} else if (path == '/bg.jpg') {
		fs.readFile('./client/bg.jpg', function (err, jpg) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(jpg);
				response.end();
			}
		});
		
	} else if (path == '/bg2.jpg') {
		fs.readFile('./client/bg2.jpg', function (err, jpg) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(jpg);
				response.end();
			}
		});
		
	} else if (path == '/card-back.png') {
		fs.readFile('./client/card-back.png', function (err, jpg) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(jpg);
				response.end();
			}
		});
		
	} else if (path == '/card-front.png') {
		fs.readFile('./client/card-front.png', function (err, jpg) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(jpg);
				response.end();
			}
		});
		
	} else if (path == '/favicon.ico') {
		fs.readFile('./client/favicon.ico', function (err, ico) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(ico);
				response.end();
			}
		});
		
	} else if (path == '/polloallimonmolamogollon') {
		console.log('Restarting the node.');
		process.exit(0);
		
	} else {
		console.log('Room accesed: ' + path);
		fs.readFile('./client/client.html', function(err, html) {
			if (err) {
				response.writeHead(404);
				response.write('404 - Page not found.');
				response.end();
			}
			else {
				response.writeHead(200);
				response.write(html);
				response.end();
			}
		});
	}
}).listen(port);

console.log("Web Server is listening in port " + port);


// WebSockets Server

var rooms = {};

var io = require("socket.io")(webServer);

io.sockets.on('connection', function (socket) {

	var address = socket.handshake.address;
	console.log((new Date()) + ' Peer connected: ' + address);

	socket.on('shiftcard', function(room, user) {
		var cards = rooms[room].cards[user];
		if (cards && cards.length > 0) {
			var card = rooms[room].cards[user].shift();
			if (card) {
				broadcastCardsByUser(rooms[room]);
				// broadcast played card
				for (var to in rooms[room].userlist) {
					rooms[room].userlist[to].emit('cardPlayed', card);
				}
				if (wrongCardPlayed(card, rooms[room])) {
					rooms[room].lives -= 1;
					broadcastLives(rooms[room]);
					removeMinorCards(card, rooms[room]);
					broadcastCardsByUser(rooms[room]);
				}
				if (levelSucceeded(rooms[room])) {
					rooms[room].level += 1;
					dealCards(rooms[room]);
				}
			}
		}
	});

	socket.on('begin', function(room) {

		rooms[room].lives = 5;
		rooms[room].level = 1;

		dealCards(rooms[room]);
	});
	
	socket.on('login', function(user, room) {
		
		// Check illegal character '#'
		if ((user.indexOf('#') >= 0) || (room.indexOf('#') >= 0)) {
			console.log('User or room error: illegal character \'#\'.');
			socket.disconnect();
			return;
		}
		
		if (rooms[room] === undefined) {
			rooms[room] = {
				'userlist' : {},
				'ids': {},
				'cards' : {},
				'mod' : [user],
				'level': 0,
				'lives': 0
			};
			socket.emit('admin', user, 'mod');
		}
		else if (rooms[room].userlist[user] !== undefined) {
			console.log('User already exists in the room.')
			socket.disconnect();
			return;
		}
		
		socket.room = room;
		socket.user = user;
		
		var id;
		if (Object.keys(rooms[room].userlist).length === 0) {
			id = 0;
		} else {
			var ids = [];
			var users = Object.keys(rooms[room].userlist);
			for (var i = 0; i < users.length; i++) {
				ids.push(rooms[room].ids[users[i]]);
			}
			ids.sort(function(a,b) { return a-b; });
			if (ids[0] === undefined || ids[0] === null || ids[0] !== 0) {
				id = 0;
			} else if (ids[1] === undefined || ids[1] === null  || ids[1] !== 1) {
				id = 1;
			} else if (ids[2] === undefined || ids[2] === null  || ids[2] !== 2) {
				id = 2;
			} else if (ids[3] === undefined || ids[3] === null  || ids[3] !== 3) {
				id = 3;
			}
			rooms[room].ids[room.username] = id;
		}
		rooms[room].ids[user] = id;

		var userlist = {
			users: Object.keys(rooms[room].userlist),
			ids: rooms[room].ids
		}

		socket.emit('userlist', JSON.stringify(userlist));
		bcast(socket, 'hello', id);
		rooms[room].userlist[user] = socket;

		socket.on('message', function(data) {
			bcast(this, 'message', data);
		});
		
		// WebRTC functions
		socket.on('offer', function (to, data) {
			send(this, 'offer', to, data);
		});
	
		socket.on('answer', function (to, data) {
			send(this, 'answer', to, data);
		});
	
		socket.on('ice', function (to, data) {
			send(this, 'ice', to, data);
		});
		
		// WebRTC stream routing request
		// socket.on('route', function(to,data) {
			// send(this, 'route', to, data);
		// });

		// Moderation
		socket.on('admin', function(to, data) {
		
			var room = socket.room;
			var from = socket.user;
			
			if (rooms[room].userlist[to] === undefined) return;
			
			var mod = rooms[room].mod.indexOf(from) >= 0;
			var muted = rooms[room].mute.indexOf(to) >= 0;
			var address = rooms[room].userlist[to].handshake.address;
			var banned = rooms[room].ban.indexOf(address) >= 0;
			
			switch (data) {
				case 'mod': if (mod && (rooms[room].mod.indexOf(to) < 0)) {
								rooms[room].mod.push(to);
								bcast_admin(socket, to, 'mod');
							}
							break;
				case 'ban': if (mod && !banned) {
								rooms[room].ban.push(address);
							}
				case 'kick': if (mod) {
								 rooms[room].userlist[to].emit('admin', to, 'kicked');
								 rooms[room].userlist[to].disconnect();
							 }
							 break;
				case 'unban': if (mod && banned) {
								 rooms[room].ban.splice(rooms[room].ban.indexOf(address),1);
							  }
							  break;
				case 'mute': if (mod && !muted) {
								 rooms[room].mute.push(to);
								 bcast_admin(socket, to, 'mute');
							 }
							 break;
				case 'unmute': if (mod && muted) {
								   rooms[room].mute.splice(rooms[room].mute.indexOf(to), 1);
								   bcast_admin(socket, to, 'unmute');
							   }
							   break;
			}
		});
		
		socket.on('disconnect', function () {
		
			var room = socket.room;
			var user = socket.user;
			bcast(socket, 'bye', '');
			delete rooms[room].userlist[user];
			if (Object.keys(rooms[room].userlist).length == 0) {
				delete rooms[room];
			}
			else {
				var mod = rooms[room].mod.indexOf(user);
				if (mod > -1) rooms[room].mod.splice(mod);
			}
		});
	});
});

// Broadcast a message
function bcast(socket, tipo, msg) {
	var room = socket.room;
	var from = socket.user;
	for (var to in rooms[room].userlist) {
		rooms[room].userlist[to].emit(tipo, from, msg);
	}

};

// Send a message
function send(socket, tipo, to, msg) {
	var room = socket.room;
	var from = socket.user;
	if (rooms[room].userlist[to] !== undefined) rooms[room].userlist[to].emit(tipo, from, msg);
};

// Admin broadcasts
function bcast_admin(socket, to, command) {
	var room = socket.room;
	var from = socket.user;
	for (var user in rooms[room].userlist) {
		rooms[room].userlist[user].emit('admin', to, command);
	}
};

function dealCards(room) {
	var nArray = [];
	for (var i = 0; i < 100; i++) {
		nArray.push(i);
	}
	var allCards = shuffle(nArray);
	// deal cards to player
	for (var to in room.userlist) {
		var userCards = [];
		for (i = 0; i < room.level; i++) {
			var card = allCards.pop().toString();
			userCards.push(card);
		}
		userCards = userCards.sort(function(a,b) {return a-b});
		room.cards[to] = userCards;
	}
	broadcastCardsByUser(room);
	broadcastLives(room);
}

function broadcastCardsByUser(room) {
	for (var to in room.userlist) {
		room.userlist[to].emit('cardsByUser', JSON.stringify(getCardsByUser(room.cards, to)));
	}
}

function broadcastLives(room) {
	for (var to in room.userlist) {
		room.userlist[to].emit('lives.update', room.lives);
	}
}

function levelSucceeded(room) {
	for (var user in room.userlist) {
		var cards = room.cards[user];
		if (cards.length > 0) {
			return false;
		}
	}
	return true;
}

function wrongCardPlayed(cardPlayed, room) {
	for (var user in room.userlist) {
		var cards = room.cards[user];
		if (cards.length > 0) {
			if (cards[0] < cardPlayed) {
				return true;
			}
		}
	}
	return false;
}

function removeMinorCards(cardPlayed, room) {
	for (var user in room.userlist) {
		var shiftTimes = 0;
		var cards = room.cards[user];
		for (var i = 0; i < cards.length; i++) {
			var currentCard = room.cards[user][i];
			if (currentCard < cardPlayed) {
				shiftTimes++;
			}
		}
		room.cards[user].splice(0, shiftTimes);
	}
}

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function getCardsByUser(cardsByUser, currentUser) {
	return Object.keys(cardsByUser).reduce(function (ofuscatedCardsByUser, user) {
		var cards = cardsByUser[user];
		if (user !== currentUser) {
			cards = new Array(cards.length);
		}
		ofuscatedCardsByUser[user] = cards;
		return ofuscatedCardsByUser;
	}, {});
}
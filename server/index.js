const http = require('https');
const fs = require('node:fs');
const options = {
    /*key: fs.readFileSync('/etc/letsencrypt/live/smashmonopoly.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/smashmonopoly.com/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/smashmonopoly.com/fullchain.pem')*/
    pfx: fs.readFileSync('latest.pfx'),
    passphrase: 'Zac9EjfEqg8BQdIiqFaQA8ztQY0Nx3iT45JglEVBDow='
};
const { Server } = require("socket.io");
const httpServer = http.createServer(options);
const io = new Server(httpServer, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000
    },
    cors: {
        origin: ['https://pokemonchess.com', 'https://elxando.co.uk', 'null'],
        methods: ['GET', 'POST']
    }
});

let availableRooms = [],
    spectationRooms = [],
    draftTimers = {},
    winTimers = {};

io.on('connection', (socket) => {
    console.log('New player: ' + socket.id);
    console.log(socket.recovered);

    socket.on('disconnecting', (reason) => {
        console.log(socket.id + ' has left for reason: ' + reason);
        // Remove from available rooms if in there
        availableRooms = availableRooms.filter(function(room){
            return room.socketid !== socket.id;
        });
        const [,thisRoom] = socket.rooms;
        if (thisRoom){
            if (!socket.data.spectator && reason == 'client namespace disconnect'){
                io.to(thisRoom).emit('playerLeft');
                spectationRooms = spectationRooms.filter(function(room){
                    return room.code !== thisRoom;
                });
                delete draftTimers[thisRoom];
                delete winTimers[thisRoom];
            } else {
                let leftRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
                if (leftRoom){
                    // remove this socket name from spectators list
                    leftRoom.spectators = leftRoom.spectators.filter(function(spectator){
                        return spectator !== socket.data.name;
                    });
                    io.to(thisRoom).emit('spectators', leftRoom.spectators);
                }

            }
        }
    });

    socket.on('playerName', (name) => {
        socket.data.name = name;
    });

    socket.on('listRooms', () => {
        let listRooms = [];
        for (const room of availableRooms){
            listRooms.push({
                host: socket.data.name,
                code: room.code,
                name: room.name,
                password: room.password ? true : false,
                winRate: room.winRate,
                no_rng: room.no_rng,
                random_teams: room.random_teams,
                timer_setting: room.timer_setting
            });
        }
        socket.emit('availableRooms', listRooms);
    });

    socket.on('listSpectate', () => {
        let listSpectate = [];
        for (const room of spectationRooms){
            listSpectate.push({
                host: socket.data.name,
                code: room.code,
                name: room.name,
                password: room.password ? true : false,
                winRate: room.winRate,
                no_rng: room.no_rng,
                random_teams: room.random_teams,
                timer_setting: room.timer_setting
            });
        }
        socket.emit('spectationRooms', spectationRooms);
    });

    socket.on('createRoom', (roomName, password, winRate, no_rng, random_teams, timer_setting) => {
        let agent = socket.handshake.headers['user-agent'],
            ip = socket.handshake.address
        let existingRoomForUser = availableRooms.find(function(room){
            return room.agent == agent && room.ip == ip;
        });
        if (!existingRoomForUser){
            spectationRooms.find(function(room){
                return room.agent == agent && room.ip == ip;
            });
        }
        if (existingRoomForUser){
            socket.emit('duplicateRoom');
            return;
        }
        let roomCode = Math.random().toString(36).substring(2, 10);
        socket.join(roomCode);
        let timerSplit = timer_setting.split('|'),
            timerMillis = parseInt(timerSplit[0]) * 60000,
            timerAdd = timerSplit[1] ? parseInt(timerSplit[1]) : 0;
        console.log(socket.data.name + ' created ' + roomName + ' on IP ' + socket.handshake.address);
        console.log(socket.handshake.headers['user-agent']);
        availableRooms.push({
            socketid: socket.id,
            host: socket.data.name,
            code: roomCode,
            name: roomName,
            password: password,
            spectators: [],
            winRate: winRate,
            no_rng: no_rng,
            random_teams: random_teams,
            timer_setting: timer_setting,
            timer_millis: timerMillis,
            timer_add: timerAdd * 1000,
            ip: ip,
            agent: agent
        });
        console.log(timerMillis);
        console.log(timerAdd);
    });

    socket.on('joinRoom', (roomCode, password) => {
        let wantedRoom = availableRooms.find(function(room){return room.code == roomCode;});
        if (!wantedRoom){
            console.log('Cant find ' + roomCode);
            socket.emit('noRoom');
        } else {
            if (!wantedRoom.password || password == wantedRoom.password){
                wantedRoom.secondary = socket.data.name;
                wantedRoom.hostRemaining = wantedRoom.timer_millis;
                wantedRoom.secondaryRemaining = wantedRoom.timer_millis;
                spectationRooms.push(wantedRoom);
                console.log('join success');
                availableRooms = availableRooms.filter(function(room){
                    return room.socketid !== wantedRoom.socketid;
                });
                socket.join(wantedRoom.code);
                wantedRoom.hostSide = Math.random() < 0.5 ? 'LIGHT' : 'DARK';
                wantedRoom.enemySide = wantedRoom.hostSide == 'DARK' ? 'LIGHT' : 'DARK';
                socket.to(wantedRoom.code).emit('playerJoined', socket.data.name, wantedRoom.hostSide, wantedRoom.random_teams);
                socket.emit('playerJoined', wantedRoom.host, wantedRoom.enemySide, wantedRoom.random_teams);
                if (!wantedRoom.random_teams){
                    draftTimers[wantedRoom.code] = setTimeout(function(){
                        io.to(wantedRoom.code).emit('draftTimeExpired');
                        delete draftTimers[wantedRoom.code];
                    }, 180000);
                }
            } else {
                console.log('wrong pass');
                console.log(password);
                console.log(wantedRoom.password);
                socket.emit('wrongPassword');
            }
        }
    });

    socket.on('spectate', (roomCode, password) => {
        let wantedRoom = spectationRooms.find(function(room){return room.code == roomCode;});
        if (!wantedRoom){
            socket.emit('noRoom');
        } else {
            if (!wantedRoom.password || password == wantedRoom.password){
                socket.data.spectator = true;
                wantedRoom.spectators.push(socket.data.name);
                socket.join(wantedRoom.code);
                socket.to(wantedRoom.code).emit('spectators', wantedRoom.spectators);
            } else {
                socket.emit('wrongPassword');
            }
        }
    });

    socket.on('ready', (types) => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        socket.to(thisRoom).emit('enemyReady', types);
        if (theRoom.socketid == socket.id){
            theRoom.hostReady = true;
        } else {
            theRoom.secondaryReady = true;
        }
        if (theRoom.hostReady && theRoom.secondaryReady){
            io.to(thisRoom).emit('startGame');
            if (theRoom.hostSide == 'LIGHT'){
                theRoom.hostStart = Date.now();
            } else {
                theRoom.secondaryStart = Date.now();
            }
        }
    });
    socket.on('unready', () => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        socket.to(thisRoom).emit('enemyUnready');
        if (theRoom.socketid == socket.id){
            theRoom.hostReady = false;
        } else {
            theRoom.secondaryReady = false;
        }
    });
    socket.on('normalMove', (pieceIndex, moveIndex, hitType) => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        socket.to(thisRoom).emit('normalMove', pieceIndex, moveIndex, hitType);
        hitClock(socket, theRoom);
    });
    socket.on('attemptTake', (pieceIndex, moveIndex) => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        let hitType = 'normal';
        if (!theRoom.no_rng){
            if (~~(Math.random() * 16) == 0){
                hitType = 'critical';
            } else if (~~(Math.random() * 10) == 0){
                hitType = 'miss';
            }    
        }

        io.to(thisRoom).emit('takeResult', pieceIndex, moveIndex, hitType);
        hitClock(socket, theRoom);
        //socket.emit('takeResult', pieceIndex, moveIndex, hitType);
    });
    socket.on('promotion', (pieceIndex, newType) => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('promotion', pieceIndex, newType);
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        hitClock(socket, theRoom);
    });
    socket.on('syncSpectators', (boardArray, chessSettings, currentPlayer) => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('syncSpectators', boardArray, chessSettings, currentPlayer);
    });
    socket.on('rematch', () => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('rematchWanted');
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        if (!theRoom){
            return;
        }
        let socketIsHost = false;
        if (socket.id == theRoom.socketid){
            theRoom.hostRematch = true;
            socketIsHost = true;
        } else {
            theRoom.secondaryRematch = true;
        }
        if (theRoom.hostRematch && theRoom.secondaryRematch){
            theRoom.hostRematch = false;
            theRoom.secondaryRematch = false;
            theRoom.hostSide = Math.random() < 0.5 ? 'LIGHT' : 'DARK';
            theRoom.enemySide = theRoom.hostSide == 'DARK' ? 'LIGHT' : 'DARK';
            // if host send hostSide
            if (socketIsHost){
                socket.emit('rematchStart', theRoom.hostSide);
                socket.to(thisRoom).emit('rematchStart', theRoom.enemySide);
            } else {
                socket.emit('rematchStart', theRoom.enemySide);
                socket.to(thisRoom).emit('rematchStart', theRoom.hostSide);
            }
            if (draftTimers[theRoom.code]){
                clearTimeout(draftTimers[theRoom.code]);
            }
            draftTimers[theRoom.code] = setTimeout(function(){
                io.to(theRoom.code).emit('draftTimeExpired');
                delete draftTimers[theRoom.code];
            }, 180000);
        }
    });
    socket.on('nextPlayer', () => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('nextPlayer');
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        hitClock(socket, theRoom);
    });
    socket.on('castle', (rookIndex, nextIndex, kingIndex, newIndex) => {
        const [,thisRoom] = socket.rooms;
        io.to(thisRoom).emit('castle', rookIndex, nextIndex, kingIndex, newIndex);
        let theRoom = spectationRooms.find(function(room){return room.code == thisRoom;});
        hitClock(socket, theRoom);
    });
});

function hitClock(socket, room){
    let timerRemaining, timerSide;
    if (room.socketid == socket.id){
        room.hostRemaining = room.hostRemaining - (Date.now() - room.hostStart);
        room.hostRemaining += room.timer_add;
        room.secondaryStart = Date.now();
        timerRemaining = room.hostRemaining;
        timerSide = room.enemySide;
    } else {
        room.secondaryRemaining = room.secondaryRemaining - (Date.now() - room.secondaryStart);
        room.secondaryRemaining += room.timer_add;
        room.hostStart = Date.now();
        timerRemaining = room.secondaryRemaining;
        timerSide = room.hostSide;
    }
    io.to(room.code).emit('timerUpdate', room.hostRemaining, room.secondaryRemaining);
    if (winTimers[room.code]){
        clearInterval(winTimers[room.code]);
    }
    winTimers[room.code] = setTimeout(function(){
        io.to(room.code).emit('timerExpired', timerSide);
        delete winTimers[room.code];
    }, timerRemaining);
}

httpServer.listen(2999, () => {
    console.log('listening on *:2999');
});
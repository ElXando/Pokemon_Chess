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
        maxDisconnectionDuration: 60 * 1000
    },
    cors: {
        origin: ['https://pokemonchess.com', 'https://elxando.co.uk', 'null'],
        methods: ['GET', 'POST']
    }
});

let availableRooms = {},
    spectationRooms = {},
    listRooms = {},
    listSpectate = {},
    draftTimers = {},
    winTimers = {},
    reconnectTimers = {},
    connectedIPs = {};

io.on('connection', (socket) => {
    console.log('New player: ' + socket.id);
    console.log(socket.recovered);
    if (!socket.handshake.query.beta){
        console.log('Disconnecting ' + socket.handshake.address + ' for not having beta query!');
        socket.disconnect(true);
    }
    let sameIP = [...io.sockets.sockets].filter(function([id, thisSocket]){
        return thisSocket.handshake.address == socket.handshake.address;
    });
    console.log(sameIP.length);
    if (sameIP.length > 10){
        console.log('Disconnected ' + socket.handshake.address + ' for having more than 10 connections');
        socket.emit('tooManyConnections');
        socket.disconnect(true);
    }
    if (socket.recovered){
        const [,thisRoom] = socket.rooms;
        if (thisRoom){
            console.log('reconnected to a game');
            if (reconnectTimers[thisRoom]){
                console.log('clearing timeout?');
                clearTimeout(reconnectTimers[thisRoom]);
                delete reconnectTimers[thisRoom];
            } else {
                console.log('NO TIMEOUT??');
            }
            socket.to(thisRoom).emit('playerReconnected');
        }
    }

    socket.on('disconnecting', (reason) => {
        console.log(socket.id + ' has left for reason: ' + reason);
        // Remove from available rooms if in there
        /*availableRooms = availableRooms.filter(function(room){
            return room.socketid !== socket.id;
        });*/
        const [,thisRoom] = socket.rooms;
        if (thisRoom){
            delete availableRooms[thisRoom];
            delete listRooms[thisRoom];
            if (!socket.data.spectator){
                socket.to(thisRoom).emit('playerLeft');
                reconnectTimers[thisRoom] = setTimeout(function(){
                    console.log(socket.id + ' disconnected for 5 seconds, cleaning up...');
                    delete spectationRooms[thisRoom];
                    delete listSpectate[thisRoom];
                    delete draftTimers[thisRoom];
                    delete winTimers[thisRoom];
                    delete reconnectTimers[thisRoom];
                }, 5000);
            } else {
                let leftRoom = spectationRooms[thisRoom];
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

    socket.on('join', (room) => {
        socket.join(room);
    });

    socket.on('listRooms', () => {
        let [,thisRoom] = socket.rooms;
        if(thisRoom){
            socket.leave(thisRoom);
            if (!socket.data.spectator){
                delete availableRooms[thisRoom];
                delete listRooms[thisRoom];
                delete spectationRooms[thisRoom];
                delete listSpectate[thisRoom];
                delete draftTimers[thisRoom];
                delete winTimers[thisRoom];
                delete reconnectTimers[thisRoom];
            }
        }
        socket.emit('availableRooms', listRooms);
    });

    socket.on('listSpectate', () => {
        socket.emit('spectationRooms', listSpectate);
    });

    socket.on('createRoom', (roomName, password, winRate, no_rng, random_teams, timer_setting) => {
        let agent = socket.handshake.headers['user-agent'],
            ip = socket.handshake.address
        /*let existingRoomForUser = availableRooms.find(function(room){
            return room.agent == agent && room.ip == ip;
        });
        if (!existingRoomForUser){
            spectationRooms.find(function(room){
                return room.agent == agent && room.ip == ip;
            });
        }*/
        let existingRoomForUser = false;
        for (const room in availableRooms){
            if (availableRooms[room].agent == agent && availableRooms[room].ip == ip){
                existingRoomForUser = true;
            }
        }
        if (!existingRoomForUser){
            for (const room in spectationRooms){
                if (spectationRooms[room].agent == agent && spectationRooms[room].ip == ip){
                    existingRoomForUser = true;
                }
            }
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
        let newRoom = {
            socketid: socket.id,
            host: socket.data.name,
            code: roomCode,
            name: roomName,
            password: password ? true : false,
            spectators: [],
            winRate: winRate,
            no_rng: no_rng,
            random_teams: random_teams,
            timer_setting: timer_setting,
            timer_millis: timerMillis,
            timer_add: timerAdd * 1000
        };
        listRooms[roomCode] = newRoom;
        let actualRoom = {...newRoom};
        actualRoom.password = password;
        actualRoom.ip = ip;
        actualRoom.agent = agent;
        availableRooms[roomCode] = actualRoom;
        /*availableRooms.push({
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
        });*/
        console.log(timerMillis);
        console.log(timerAdd);
    });

    socket.on('joinRoom', (roomCode, password) => {
        //let wantedRoom = availableRooms.find(function(room){return room.code == roomCode;});
        let wantedRoom = availableRooms[roomCode];
        if (!wantedRoom){
            console.log('Cant find ' + roomCode);
            socket.emit('noRoom');
        } else {
            if (!wantedRoom.password || password == wantedRoom.password){
                listSpectate[roomCode] = listRooms[roomCode];
                listSpectate[roomCode].secondary = socket.data.name;
                delete listRooms[roomCode];

                wantedRoom.secondary = socket.data.name;
                wantedRoom.hostRemaining = wantedRoom.timer_millis;
                wantedRoom.secondaryRemaining = wantedRoom.timer_millis;
                spectationRooms[roomCode] = wantedRoom;
                // change pointer
                //wantedRoom = spectationRooms[roomCode];
                console.log('join success');
                delete availableRooms[roomCode];
                /*availableRooms = availableRooms.filter(function(room){
                    return room.socketid !== wantedRoom.socketid;
                });*/
                socket.join(wantedRoom.code);
                wantedRoom.hostSide = Math.random() < 0.5 ? 'LIGHT' : 'DARK';
                wantedRoom.enemySide = wantedRoom.hostSide == 'DARK' ? 'LIGHT' : 'DARK';
                socket.to(wantedRoom.code).emit('playerJoined', socket.data.name, wantedRoom.hostSide, wantedRoom.random_teams);
                socket.emit('playerJoined', wantedRoom.host, wantedRoom.enemySide, wantedRoom.random_teams);
                if (!wantedRoom.random_teams && wantedRoom.timer_setting != 'F'){
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
        let wantedRoom = spectationRooms[roomCode];
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
        let theRoom = spectationRooms[thisRoom];
        if (!theRoom){
            return;
        }
        let typeCheck = new Set(types);
        if (typeCheck.size < 16){
            socket.emit('badTypes');
            return;
        }
        socket.to(thisRoom).emit('enemyReady', types);
        if (theRoom.socketid == socket.id){
            theRoom.hostReady = true;
        } else {
            theRoom.secondaryReady = true;
        }
        if (theRoom.hostReady && theRoom.secondaryReady){
            theRoom.hostReady = false;
            theRoom.secondaryReady = false;
            if (draftTimers[thisRoom]){
                clearTimeout(draftTimers[thisRoom]);
                delete draftTimers[thisRoom];
            }
            io.to(thisRoom).emit('startGame');
            /*if (theRoom.hostSide == 'LIGHT'){
                theRoom.hostStart = Date.now();
            } else {
                theRoom.secondaryStart = Date.now();
            }*/
            //hitClock(socket, theRoom, true);
        }
    });
    socket.on('unready', () => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms[thisRoom];
        if (!theRoom){
            return;
        }
        socket.to(thisRoom).emit('enemyUnready');
        if (theRoom.socketid == socket.id){
            theRoom.hostReady = false;
        } else {
            theRoom.secondaryReady = false;
        }
    });
    socket.on('normalMove', (pieceIndex, moveIndex, hitType) => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms[thisRoom];
        if (!theRoom){
            return;
        }
        let theSide = theRoom.socketid == socket.id ? theRoom.hostSide : theRoom.enemySide;
        if (hitType && hitType != 'none'){
            io.to(thisRoom).emit('timerExpired', theSide);
            return;
        }
        //let theRoom = spectationRooms[thisRoom];
        socket.to(thisRoom).emit('normalMove', pieceIndex, moveIndex, hitType);
        //hitClock(socket, theRoom);
    });
    socket.on('attemptTake', (pieceIndex, moveIndex) => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms[thisRoom];
        if (!theRoom){
            return;
        }
        let hitType = 'normal';
        if (!theRoom.no_rng){
            if (~~(Math.random() * 16) == 0){
                hitType = 'critical';
            } else if (~~(Math.random() * 20) == 0){
                hitType = 'miss';
            }    
        }

        io.to(thisRoom).emit('takeResult', pieceIndex, moveIndex, hitType);
        //hitClock(socket, theRoom);
        //socket.emit('takeResult', pieceIndex, moveIndex, hitType);
    });
    socket.on('promotion', (pieceIndex, newType) => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms[thisRoom];
        if (!theRoom){
            return;
        }
        let theSide = theRoom.socketid == socket.id ? theRoom.hostSide : theRoom.enemySide;
        if (theSide == 'LIGHT' && pieceIndex < 56){
            io.to(thisRoom).emit('timerExpired', theSide);
            return;
        } else if (theSide == 'DARK' && pieceIndex > 7){
            io.to(thisRoom).emit('timerExpired', theSide);
            return;
        }
        socket.to(thisRoom).emit('promotion', pieceIndex, newType);
        //hitClock(socket, theRoom);
    });
    socket.on('syncSpectators', (boardArray, chessSettings, currentPlayer) => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('syncSpectators', boardArray, chessSettings, currentPlayer);
    });
    socket.on('rematch', () => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('rematchWanted');
        let theRoom = spectationRooms[thisRoom];
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
            theRoom.hostStart = undefined;
            theRoom.secondaryStart = undefined;
            theRoom.hostRemaining = theRoom.timer_millis;
            theRoom.secondaryRemaining = theRoom.timer_millis;
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
            if (!theRoom.random_teams && theRoom.timer_setting != 'F'){
                draftTimers[theRoom.code] = setTimeout(function(){
                    io.to(theRoom.code).emit('draftTimeExpired');
                    delete draftTimers[theRoom.code];
                }, 180000);
            }

        }
    });
    socket.on('nextPlayer', () => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('nextPlayer');
        let theRoom = spectationRooms[thisRoom];
        //hitClock(socket, theRoom);
    });
    socket.on('castle', (rookIndex, nextIndex, kingIndex, newIndex) => {
        const [,thisRoom] = socket.rooms;
        io.to(thisRoom).emit('castle', rookIndex, nextIndex, kingIndex, newIndex);
        let theRoom = spectationRooms[thisRoom];
        //hitClock(socket, theRoom);
    });
    socket.on('forfeit', () => {
        const [,thisRoom] = socket.rooms;
        socket.to(thisRoom).emit('forfeit');
    });
    socket.on('stats', () => {
        console.log('Available Rooms: ' + Object.keys(availableRooms).length);
        console.log('Spectation Rooms: ' + Object.keys(spectationRooms).length);
        console.log('Draft Timers: ' + Object.keys(draftTimers).length);
        console.log('Win Timers: ' + Object.keys(winTimers).length);
        console.log('Reconnect Timers: ' + Object.keys(reconnectTimers).length);
    });
    socket.on('hitClock', () => {
        const [,thisRoom] = socket.rooms;
        let theRoom = spectationRooms[thisRoom];
        if (!theRoom){
            return;
        }
        if (theRoom.timer_setting != 'F'){
            hitClock(socket, theRoom);
        }
    });
});

function hitClock(socket, room){
    console.log('clock time!');
    let timerRemaining, timerSide;
    if (room.socketid == socket.id){
        if (room.hostStart){
            room.hostRemaining = room.hostRemaining - (Date.now() - room.hostStart);
            room.hostRemaining += room.timer_add;
        }
        room.secondaryStart = Date.now();
        timerRemaining = room.secondaryRemaining;
        timerSide = room.enemySide;
    } else {
        if (room.secondaryStart){
            room.secondaryRemaining = room.secondaryRemaining - (Date.now() - room.secondaryStart);
            room.secondaryRemaining += room.timer_add;
        }
        room.hostStart = Date.now();
        timerRemaining = room.hostRemaining;
        timerSide = room.hostSide;
    }
    io.to(room.code).emit('timerUpdate', room.hostRemaining, room.secondaryRemaining);
    if (winTimers[room.code]){
        clearTimeout(winTimers[room.code]);
    }
    winTimers[room.code] = setTimeout(function(){
        io.to(room.code).emit('timerExpired', timerSide);
        delete winTimers[room.code];
    }, timerRemaining);
}

httpServer.listen(2999, () => {
    console.log('listening on *:2999');
});
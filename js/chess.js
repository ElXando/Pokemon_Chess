var canvas = document.getElementById('chess_game');

var boardArray = new Array(64),
    boardSpace = (canvas.width / 8),
    context = canvas.getContext('2d'),
    currentPiece,
    previousPiece,
    currentPlayer,
    images = {},
    chosenTypes = [];

let chessSettings = {
    started: false,
    highlight: []
};

let savedTeams = {

};

const Side = {
    LIGHT : { name: "Light", file: "white", value: "1" },
    DARK : { name: "Dark", file: "black", value: "-1" }
};
const Type = {
    BISHOP: "bishop",
    KING: "king",
    KNIGHT: "knight",
    PAWN: "pawn",
    QUEEN: "queen",
    ROOK: "rook"
};
const Flag = {
    NONE: "none",
    PASSIVE: "passive",
    ATTACK: "attack",
    CASTLE: "castle",
    KING: "king"
};
const pokemon_types = [
    {type: 'normal',colour: '#aa9', none: ['ghost'], not: ['rock', 'steel'], super: []},
    {type: 'fire',colour: '#f42', none: [], not: ['fire', 'water', 'rock', 'dragon'], super: ['grass', 'ice', 'bug', 'steel']},
    {type: 'water',colour: '#39f', none: [], not: ['water', 'grass', 'dragon'], super: ['fire', 'ground', 'rock']},
    {type: 'electric',colour: '#fc3', none: ['ground'], not: ['electric', 'grass', 'dragon'], super: ['water', 'flying']},
    {type: 'grass',colour: '#7c5', none: [], not: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], super: ['water', 'ground', 'rock']},
    {type: 'ice',colour: '#6cf', none: [], not: ['fire', 'water', 'ice', 'steel'], super: ['grass', 'ground', 'flying', 'dragon']},
    {type: 'fighting',colour: '#b54', none: ['ghost'], not: ['poison', 'flying', 'psychic', 'bug', 'fairy'], super: ['normal', 'ice', 'rock', 'dark', 'steel']},
    {type: 'poison',colour: '#a59', none: ['steel'], not: ['poison', 'ground', 'rock', 'ghost'], super: ['grass', 'fairy']},
    {type: 'ground',colour: '#db5', none: ['flying'], not: ['grass', 'bug'], super: ['fire', 'electric', 'poison', 'rock', 'steel']},
    {type: 'flying',colour: '#89f', none: [], not: ['electric', 'rock', 'steel'], super: ['grass', 'fighting', 'bug']},
    {type: 'psychic',colour: '#f59', none: ['dark'], not: ['psychic', 'steel'], super: ['fighting', 'poison']},
    {type: 'bug',colour: '#ab2', none: [], not: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], super: ['grass', 'psychic', 'dark']},
    {type: 'rock',colour: '#ba6', none: [], not: ['fighting', 'ground', 'steel'], super: ['fire', 'ice', 'flying', 'bug']},
    {type: 'ghost',colour: '#66b', none: ['normal'], not: ['dark'], super: ['psychic', 'ghost']},
    {type: 'dragon',colour: '#76e', none: ['fairy'], not: ['steel'], super: ['dragon']},
    {type: 'dark',colour: '#754', none: [], not: ['fighting', 'dark', 'fairy'], super: ['psychic', 'ghost']},
    {type: 'steel',colour: '#aab', none: [], not: ['fire', 'water', 'electric', 'steel'], super: ['ice', 'rock', 'fairy']},
    {type: 'fairy',colour: '#e9e', none: [], not: ['fire', 'poison', 'steel'], super: ['fighting', 'dragon', 'dark']}
];

/* TODO
    - randomise white/black when both players have joined - done
    - swap piece rows for other team - done
    - promotion with choice - done
    - castling - done
    - spectation - almost there, clock just a bit fucked
    - 3 minute draft timer - done
    - chess clock - done, you lose if you run out
    - show taken pieces - done
    - check/checkmate/win mechanics (only win) - win working?
    - none effect - done
    - randomise assignment - done
    - remove passwords from frontend - done
    - make none miss your turn - done
    - rematch with randomised sides - done
    - show piece movement #bec858 - done
    - en passant - done
    - make rooms not reliant on room name - done
    - super effective & critical lock you to current piece with option to skip - done
    fix not very effective pawn death - done
    fix not very effective KING death - done
    en passant bug kill your own pawn?
    hide skip additional move when rematching - done
    draft timer not working after rematch - done
    low health music in check - done
    POLISH - no alerts/confirm/prompt
    check music keeps playing after win - maybe because of super effective? - fixed
    show missed / no effect move attempt - done

    Spectating no time game - hide the timer
    Fix detaching numbers - done


    v2
    audio play loaded in elements rather than creating new object - done
    reconnection completed
    win timer on server - DONE!
    queen promote kill - done
    team builder - half done
    back to menu
    max connections per ip - done
    maximum type of pokemon - next update?
    forfeit button - done?
    draws if both kings die
    JS cleanup
    basic cheater detection (one type, bad promotion) - done
*/

let socket;

let protected_names = ['el xando', 'ei xando', 'little z', 'littie z', 'hopcat', 'poppt1', 'director cogger', 'cogger'];
let bad_words = ['nigger', 'nlgger', 'chink', 'coon', 'n1gger', 'n1gg3r', 'nigg3r', 'golliwog', 'niglet', 'c00n', 'retard', '<script', '/script>'];

let imagesLoaded;
let availableTable, spectateTable;

let gifList = ['bishop missed', 'bishop none', 'king missed', 'king none', 'knight missed', 'knight none', 'pawn missed', 'pawn none',
    'queen missed', 'queen none', 'rook missed', 'rook none', 'critical', 'not-very', 'super'];
let audioList = ['check', 'critical', 'missed', 'nope', 'not-very', 'plink', 'promotion', 'super'];

let gifs = {}, audios = {check: {pause: function(){console.log('not loaded');}}};

function backToMenu(){
    if (chessSettings.clock){
        clearInterval(chessSettings.clock);
    }
    $('#setup_div').removeClass('hidden');
    $('#game').addClass('hidden');
    $('#roomName').val('');
    $('#roomPassword').val('');
    $('#no_rng, #random_teams').removeClass('fa-toggle-on').addClass('fa-toggle-off');
    $('#timer_setting').val('10');
    $('#start_host').removeClass('hidden');
    $('#room_settings').addClass('hidden');
    $('#host_game').addClass('hidden');
    $('.board_message').addClass('hidden');
    $('.taken_area').html('');
    $('#player_ready, #enemy_ready').addClass('unready').removeClass('ready');
    $('#enemy_ready').html('Unready <i class="fa fa-thumbs-down"></i>');
    $('#player_ready').html('Ready <i class="fa fa-thumbs-up"></i>');
    $('#chess_clock').addClass('hidden');
    $('#switch_sides').addClass('hidden');
    $('.team_builder').addClass('hidden');
    $('#forfeit_game').addClass('hidden');
    $('.enemy_element').removeClass('hidden');
    $('#piece_setup_div').addClass('hidden');
    $('#spectators').html('');
    $('#game').css('pointer-events', '');
    $('#player_name').html($('#yourName').val());
    chessSettings = {
        started: false,
        highlight: [],
        playerName: $('#yourName').val()
    };
    chosenTypes = [];
    previousPiece = undefined;
    socket.emit('listRooms');
    socket.emit('listSpectate');
}
function anyBadWords(checkText){
    for (let badWord of bad_words){
        if (checkText.toLowerCase().includes(badWord)){
            localStorage.setItem('name', 'Worthless Human');
            localStorage.setItem('losses', '999999');
            localStorage.removeItem('savedTeams');
            alert('Be better.');
            location.reload();
            window.close();
            return true;
        }
    }
}

function badNameCheck(){
    if (protected_names.includes($('#yourName').val().trim().toLowerCase())){
        let enteredPass = localStorage.getItem('name_password');
        if (!enteredPass){
            enteredPass = prompt('Protected name! Please enter password.');
        }
        if (md5(enteredPass) != '1da2d6be7b4f126baaa84c352c2be49a'){
            alert('Wrong password, stop trying to impersonate people. Be better.');
            $('#yourName').val('Idiot').trigger('focusout');
            return true;
        } else {
            localStorage.setItem('name_password', enteredPass);
        }
    }
}

function imageLoaded(){
    imagesLoaded++;
    $('#loaded_count').html(imagesLoaded + '/197');
    if (imagesLoaded == 174){
        preloadMessages();
        /*$('#preloading_images').remove();
        $('#images_loaded').removeClass('hidden');*/
    }
}

function preloadMessages(){
    let loadedImages = 174;
    loadedImages += 15 - gifList.length;
    loadedImages += 8 - audioList.length;
    $('#loaded_count').html(loadedImages + '/197');
    if (gifList.length){
        let gifToLoad = gifList[gifList.length-1];
        gifList.pop();
        gifs[gifToLoad] = new Image();
        gifs[gifToLoad].onload = preloadMessages;
        gifs[gifToLoad].src = 'gifs/' + gifToLoad + '.gif';
    } else if (audioList.length){
        let audioToLoad = audioList[audioList.length-1];
        audioList.pop();
        audios[audioToLoad] = new Audio();
        audios[audioToLoad].oncanplaythrough = preloadMessages;
        switch (audioToLoad){
            case 'check':
                audios[audioToLoad].volume = 0.2;
                audios[audioToLoad].loop = true;
                break;
            case 'promotion':
                audios[audioToLoad].volume = 0.5;
                break;
            case 'plink':
                audios[audioToLoad].volume = 0.3;
                break;
        }
        audios[audioToLoad].src = 'audio/' + audioToLoad + '.mp3';
    } else {
        clearInterval(chessSettings.loadTimeout);
        $('#preloading_images').remove();
        $('#images_loaded').removeClass('hidden');
    }
}

function loadImages(){
    // Update div check
    let updates = JSON.parse(localStorage.getItem('updates'));
    if (!updates){
        updates = [];
    }
    $('.update_div').each(function(){
        if (!updates.includes($(this).data('date'))){
            $(this).removeClass('hidden');
        }
    });

    imagesLoaded = 0;
    for (const pieceType in Type) {
        for (const colour in Side) {
            images[Side[colour].file+'_'+Type[pieceType]] = new Image(40,40);
            images[Side[colour].file+'_'+Type[pieceType]].onload = imageLoaded;
            images[Side[colour].file+'_'+Type[pieceType]].src = 'img/'+Type[pieceType]+' '+Side[colour].file+'.png';

            if (Type[pieceType] == 'pawn'){
                for (const pokemon_type of pokemon_types){
                    images['pawn'+Side[colour].file[0]+'_'+pokemon_type.type] = new Image(40,40);
                    images['pawn'+Side[colour].file[0]+'_'+pokemon_type.type].onload = imageLoaded;
                    images['pawn'+Side[colour].file[0]+'_'+pokemon_type.type].src = 'img/pawn'+Side[colour].file[0]+' '+pokemon_type.type+'.png';
                    images['promote'+Side[colour].file[0]+'_'+pokemon_type.type] = new Image(40,40);
                    images['promote'+Side[colour].file[0]+'_'+pokemon_type.type].onload = imageLoaded;
                    images['promote'+Side[colour].file[0]+'_'+pokemon_type.type].src = 'img/promote'+Side[colour].file[0]+' '+pokemon_type.type+'.png';
                }
            }
        }
        if (Type[pieceType] !== 'pawn'){
            for (const pokemon_type of pokemon_types){
                images[Type[pieceType]+'_'+pokemon_type.type] = new Image(40,40);
                images[Type[pieceType]+'_'+pokemon_type.type].onload = imageLoaded;
                images[Type[pieceType]+'_'+pokemon_type.type].src = 'img/'+Type[pieceType]+' '+pokemon_type.type+'.png';
            }
        }
    }

    chessSettings.loadTimeout = setTimeout(function(){
        $('#preloading_images').remove();
        $('#images_loaded').removeClass('hidden');
    }, 60000);

    $('#start_host').click(function(){
        $(this).addClass('hidden');
        $('#room_settings').removeClass('hidden');
        $('#host_game').removeClass('hidden');
    });

    $('#host_game').click(function(){
        if (badNameCheck()){
            return;
        }

        if (anyBadWords($('#yourName').val())){
            return;
        }
        if (anyBadWords($('#roomName').val())){
            return;
        }

        if ($('#roomName').val().trim()){
            let roomName = $('#roomName').val();
            roomName = roomName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            let wins = parseInt(localStorage.getItem('wins'));
            let losses = parseInt(localStorage.getItem('losses'));
            let winRate = 'N/A';
            if (!isNaN(wins) && !isNaN(losses)){
                winRate = wins / (wins + losses) * 100;
                winRate = winRate.toFixed(2) + '%';
            } else if (!isNaN(wins)){
                winRate = '100%';
            } else if (!isNaN(losses)){
                winRate = '0%';
            }
            //no_rng, random_teams, timer_setting
            let no_rng = $('#no_rng').hasClass('fa-toggle-on'),
                random_teams = $('#random_teams').hasClass('fa-toggle-on'),
                timer_setting = $('#timer_setting').val();
            socket.emit('createRoom', roomName, $('#roomPassword').val(), winRate, no_rng, random_teams, timer_setting);
            $('#enemy_name').html('Awaiting Opponent...');
            $('#setup_div').addClass('hidden');
            $('#game').removeClass('hidden');
            chessSettings.host = true;
            chessSettings.random_teams = random_teams;
            chessSettings.side = Side.LIGHT;
            chessSettings.timer_setting = timer_setting;
            setupGame();
        } else {
            alert('Enter a room name!');
        }
    });

    $('#yourName').on('focusout', function(){
        if ($(this).val().trim()){
            $(this).val($(this).val().replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            try {
                localStorage.setItem('name', $(this).val());
            } catch {
                $('#roomName').focus();
                alert('Please enable third party cookies!');
            }

            chessSettings.playerName = $(this).val();
            socket.emit('playerName', $(this).val());
            $('#player_name').html($(this).val());
            $('#has_name').removeClass('hidden');
        } else {
            $('#has_name').addClass('hidden');
        }

    });

    socket = io('https://pokemonchess.com:2999', {
        timeout: 5000,
        query: {
            beta: true
        }
    });

    socket.on('connect', () => {
        console.log('recovered?', socket.recovered);
        if (socket.recovered){
            $('#you_disconnected').addClass('hidden');
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('disconnected for reason:');
        console.log(reason);
        $('#disconnect_reason').html(reason);
        $('#you_disconnected').removeClass('hidden');
    });

    socket.emit('listRooms');
    socket.emit('listSpectate');

    if (localStorage.getItem('name')){
        $('#yourName').val(localStorage.getItem('name'));
        chessSettings.playerName = $('#yourName').val();
        socket.emit('playerName', $('#yourName').val());
        $('#player_name').html($('#yourName').val());
        $('#has_name').removeClass('hidden');
    }

    socket.on('availableRooms', (availableRooms) => {
        if (availableTable){
            availableTable.destroy();
            availableTable = undefined;
        }
        console.log(availableRooms);
        $('#available_count').html('(' + Object.keys(availableRooms).length + ')');
        $('#room_list').html('');
        for (let room in availableRooms){
            room = availableRooms[room];
            let no_rng = room.no_rng ? 'fa-toggle-on' : 'fa-toggle-off',
                random_teams = room.random_teams ? 'fa-toggle-on' : 'fa-toggle-off',
                timer_friendly;
            if (room.timer_setting == '10'){
                timer_friendly = '10 Mins';
            } else if (room.timer_setting == '3|2'){
                timer_friendly = 'Blitz 3|2'
            } else {
                timer_friendly = 'None';
            }
            $('#room_list').append('<tr data-timer="'+room.timer_setting+'" class="pointer" data-pass="'+(room.password ? 'T' : 'F')+'" data-code="'+room.code+'"><td>'+room.host+
                '</td><td>'+room.name+'</td><td>'+room.winRate+'</td><td data-order="' + (room.password ? '1' : '0') + '">'+
                '<i class="fa fa-lock'+(room.password ? '' : '-open')+'"></i></td><td><i class="fa '+no_rng+'"></i></td><td><i class="fa '+random_teams+'"></i></td><td>'+timer_friendly+'</tr>');
        }
        if (!Object.keys(availableRooms).length){
            $('#room_list').append('<tr><td colspan="100%">No rooms currently available.</td></tr>');
        } else {
            availableTable = $('#available_table').DataTable({dom: 'ft', paging: false, columnDefs: [{className: 'dt-head-center', targets: '_all'}]});
        }

        setTimeout(function(){
            $('.reload-rooms').removeClass('fa-spin');
        }, 1000);
    });

    $('.reload-rooms').click(function(){
        $('.reload-rooms').addClass('fa-spin');
        socket.emit('listRooms');
    });

    $('#room_list').on('click', 'tr.pointer', function(){
        if (badNameCheck()){
            return;
        }

        if (anyBadWords($('#yourName').val())){
            return;
        }

        chessSettings.timer_setting = $(this).data('timer');

        if ($(this).data('pass') == 'T'){
            let enteredPass = prompt('Enter the password!');
            socket.emit('joinRoom', $(this).data('code'), enteredPass);
        } else {
            socket.emit('joinRoom', $(this).data('code'));
        }
    });

    socket.on('spectationRooms', (spectationRooms) => {
        if (spectateTable){
            spectateTable.destroy();
            spectateTable = undefined;
        }
        $('#spectate_count').html('(' + Object.keys(spectationRooms).length + ')');
        $('#spectate_list').html('');
        for (let room in spectationRooms){
            room = spectationRooms[room];
            let hasPassword = room.password ? 'T' : 'F';
            $('#spectate_list').append('<tr data-timer="'+room.timer_setting+'" class="pointer" data-pass="'+hasPassword+'" data-code="'+room.code+'"><td>'+room.host+'</td><td>'+room.secondary+
                '</td><td>'+room.name+'</td><td data-order="' + (hasPassword == 'T' ? '1' : '0') + '"><i class="fa fa-lock'+(hasPassword == 'T' ? '' : '-open') +'"></i></td></tr>');
        }
        if (!Object.keys(spectationRooms).length){
            $('#spectate_list').append('<tr><td colspan="100%">No games in progress.</td></tr>');
        } else {
            spectateTable = $('#spectate_table').DataTable({dom: 'ft', paging: false, columnDefs: [{className: 'dt-head-center', targets: '_all'}]});
        }
        setTimeout(function(){
            $('.reload-spectate').removeClass('fa-spin');
        }, 1000);
    });

    $('.reload-spectate').click(function(){
        $('.reload-spectate').addClass('fa-spin');
        socket.emit('listSpectate');
    });

    $('#spectate_list').on('click', 'tr.pointer', function(){
        if (badNameCheck()){
            return;
        }

        if (anyBadWords($('#yourName').val())){
            return;
        }

        chessSettings.timer_setting = $(this).data('timer');

        preloadMessages();
        chessSettings.spectator = true;
        if ($(this).data('pass') == 'T'){
            let enteredPass = prompt('Enter the password!');
            socket.emit('spectate', $(this).data('code'), enteredPass);
        } else {
            socket.emit('spectate', $(this).data('code'));
        }
    });

    socket.on('playerJoined', (playerName, side, random_teams) => {
        $('#setup_div').addClass('hidden');
        $('#game').removeClass('hidden');
        if (chessSettings.timer_setting != 'F'){
            $('#chess_clock').removeClass('hidden');
        }
        if (!chessSettings.host){
            setupGame();
        }
        chessSettings.side = Side[side];
        if (side == 'LIGHT'){
            $('.grid_numbers').css('flex-direction', 'column');
            $('.grid_letters').css('flex-direction', 'row');
        } else {
            $('.grid_numbers').css('flex-direction', 'column-reverse');
            $('.grid_letters').css('flex-direction', 'row-reverse');
        }
        drawAll();
        chessSettings.enemyName = playerName;
        $('#enemy_name').html(playerName);
        if (random_teams){
            chessSettings.random_teams = true;
            chessSettings.draftOver = true;
            $('#randomise_missing').click();
        } else {
            $('#piece_setup_div').removeClass('hidden');
            startDraftTimer();
        }

    });

    socket.on('enemyReady', (types) => {
        console.log('enemy ready');
        $('#enemy_ready').removeClass('unready').addClass('ready').html('Ready <i class="fa fa-thumbs-up"></i>');
        chessSettings.enemyTypes = types;
        if (chessSettings.ready){
            //startGame();
        }
    });

    socket.on('enemyUnready', () => {
        $('#enemy_ready').addClass('unready').removeClass('ready').html('Unready <i class="fa fa-thumbs-down"></i>');
        chessSettings.enemyTypes = undefined;
    });

    socket.on('normalMove', (pieceIndex, moveIndex, hitType) => {
        console.log('normal received: ' + pieceIndex + '>' + moveIndex);
        currentPiece = boardArray[pieceIndex].piece;
        currentPiece.move(moveIndex, hitType);
    });

    socket.on('castle', (rookIndex, nextIndex, kingIndex, newIndex) => {
        boardArray[rookIndex].piece.move(nextIndex, false, true);
        currentPiece = boardArray[kingIndex].piece;
        currentPiece.move(newIndex);
    });

    socket.on('takeResult', (pieceIndex, moveIndex, hitType) => {
        currentPiece = boardArray[pieceIndex].piece;
        currentPiece.move(moveIndex, hitType);
    });

    $('#randomise_all').click(function(){
        chosenTypes = [];
        let start = 0;
        if (chessSettings.side !== Side.LIGHT){
            start = 48;
        }
        let availableTypes = pokemon_types.map(function(types){return types.type;});
        let newType;
        for (let i = start; i < start + 16; i++){
            newType = availableTypes[~~(Math.random() * availableTypes.length)];
            chosenTypes.push(newType);
            availableTypes.splice(availableTypes.indexOf(newType), 1);
            boardArray[i].piece.pokemon_type = pokemon_types.find(function(types){return types.type == newType});
            draw(i);
        }
        checkPieceSelection();
    });

    $('#randomise_missing').click(function(){
        let start = 0;
        if (chessSettings.side !== Side.LIGHT){
            start = 48;
        }
        let availableTypes = pokemon_types.map(function(types){return types.type;});
        availableTypes = availableTypes.filter(function(type){return !chosenTypes.includes(type);});
        let newType;
        for (let i = start; i < start + 16; i++){
            if (!boardArray[i].piece.pokemon_type) {
                newType = availableTypes[~~(Math.random() * availableTypes.length)];
                chosenTypes.push(newType);
                availableTypes.splice(availableTypes.indexOf(newType), 1);
                boardArray[i].piece.pokemon_type = pokemon_types.find(function (types) {
                    return types.type == newType;
                });
                draw(i);
            }
        }
        if (chessSettings.draftOver){
            $('#player_ready').click();
        } else {
            checkPieceSelection();
        }
    });

    socket.on('draftTimeExpired', () => {
        console.log('draft time expired!');
        if (!chessSettings.started && $('#player_ready').hasClass('unready')){
            chessSettings.draftOver = true;
            $('#randomise_missing').click();
        }
    });

    $('#promotion_choice').on('click', 'img', function(){
        chessSettings.wait = false;
        let newType = $(this).data('type');
        currentPiece.type = Type[newType];
        currentPiece.promotion = true;
        draw(currentPiece.getIndex());
        playAudio('promotion', 0.5);
        socket.emit('promotion', currentPiece.getIndex(), newType);
        if (!chessSettings.critical){
            socket.emit('hitClock');
            nextPlayer();
        } else {
            currentPiece.clearValidMoves();
            currentPiece.setValidMoves();
            currentPiece.showValidMoves();
        }
        $('#promotion_choice').addClass('hidden');
    });

    socket.on('promotion', (pieceIndex, newType) => {
        boardArray[pieceIndex].piece.type = Type[newType];
        boardArray[pieceIndex].piece.promotion = true;
        draw(pieceIndex);
        playAudio('promotion', 0.5);
        if (!chessSettings.critical){
            nextPlayer();
        } else {
            boardArray[pieceIndex].piece.clearValidMoves();
            boardArray[pieceIndex].piece.setValidMoves();
            boardArray[pieceIndex].piece.showValidMoves();
        }
    });

    socket.on('wrongPassword', () => {
        alert('Wrong password!');
        chessSettings.spectator = false;
    });

    socket.on('noRoom', () => {
        alert('That room no longer exists.');
        chessSettings.spectator = false;
    });

    socket.on('spectators', (spectators) => {
        if (spectators.length){
            if (chessSettings.host){
                socket.emit('syncSpectators', boardArray, chessSettings, currentPlayer, $('#player_taken').html(), $('#enemy_taken').html());
            }
            $('#spectators').html('<b>Spectators</b><br /><br />');
            for (spectator of spectators){
                $('#spectators').append(spectator);
                $('#spectators').append('<br />');
            }
        } else {
            $('#spectators').html('');
        }
    });

    socket.on('syncSpectators', (newBoardArray, newChessSettings, newCurrentPlayer, playerTaken, enemyTaken) => {
        if (chessSettings.spectator){
            if (chessSettings.timer_setting != 'F'){
                $('#chess_clock').removeClass('hidden');
            }
            if (chessSettings.clock){
                clearInterval(chessSettings.clock);
            }

            $('#player_taken').html(playerTaken);
            $('#enemy_taken').html(enemyTaken);
            $('#setup_div').addClass('hidden');
            $('#player_ready, #enemy_ready').addClass('hidden');
            $('#game').removeClass('hidden').css('pointer-events', 'none');
            newChessSettings.spectator = true;
            newChessSettings.host = true;
            newChessSettings.audio = undefined;
            newChessSettings.side = newChessSettings.side.name == 'Light' ? Side.LIGHT : Side.DARK;
            newCurrentPlayer = newCurrentPlayer.name == 'Light' ? Side.LIGHT : Side.DARK;
            if (newCurrentPlayer == newChessSettings.side){
                newChessSettings.playerRemaining = newChessSettings.currentRemaining;
            } else {
                newChessSettings.enemyRemaining = newChessSettings.currentRemaining;
            }
            if (newChessSettings.side.name == 'Light'){
                $('.grid_numbers').css('flex-direction', 'column');
                $('.grid_letters').css('flex-direction', 'row');
            } else {
                $('.grid_numbers').css('flex-direction', 'column-reverse');
                $('.grid_letters').css('flex-direction', 'row-reverse');
            }
            chessSettings = newChessSettings;
            boardArray = newBoardArray;
            previousPiece = undefined;
            for (eachSpace of boardArray){
                if (eachSpace.piece){
                    let pokemon_type = eachSpace.piece.pokemon_type;
                    eachSpace.piece = new GamePiece(eachSpace.piece.type, eachSpace.piece.side);
                    eachSpace.piece.pokemon_type = pokemon_type;
                    eachSpace.piece.side = eachSpace.piece.side.name == 'Light' ? Side.LIGHT : Side.DARK;
                }
            }
            drawAll();
            $('#player_name').html(chessSettings.playerName);
            $('#enemy_name').html(chessSettings.enemyName);
            currentPlayer = newCurrentPlayer;
            if (!chessSettings.started){
                $('#enemy_clock').html('Draft');
                startDraftInterval();
            } else {
                $('#player_clock').html(millisToClock(chessSettings.playerRemaining));
                $('#enemy_clock').html(millisToClock(chessSettings.enemyRemaining));
                hitClock();
            }
        }
    });

    $('#rematch').on('click', function(){
        socket.emit('rematch');
    });

    socket.on('rematchWanted', () => {
        $('#rematch_wanted').html(chessSettings.enemyName + ' wants a rematch!<br />');
    });

    socket.on('rematchStart', (newSide) => {
        chessSettings.side = Side[newSide];
        if (newSide == 'LIGHT'){
            $('.grid_numbers').css('flex-direction', 'column');
            $('.grid_letters').css('flex-direction', 'row');
        } else {
            $('.grid_numbers').css('flex-direction', 'column-reverse');
            $('.grid_letters').css('flex-direction', 'row-reverse');
        }
        rematch();
    });

    $('#piece_choice').off().on('click', '.choose_type', function(){
        let clickedType = $(this).data('type');
        if (chosenTypes.includes(clickedType)){
            let previousType = boardArray.filter(function(slot){
                if (slot.piece){
                    if (slot.piece.pokemon_type){
                        return slot.piece.pokemon_type.type == clickedType;
                    }
                }
            })[0];
            delete previousType.piece.pokemon_type;
            draw(previousType.piece.getIndex());
        }
        if (currentPiece.pokemon_type){
            $('img[data-type="'+currentPiece.pokemon_type.type+'"]').css('opacity', '');
            chosenTypes.splice(chosenTypes.indexOf(currentPiece.pokemon_type.type), 1);
        }
        if (!chosenTypes.includes(clickedType)){
            chosenTypes.push(clickedType);
        }
        currentPiece.pokemon_type = pokemon_types.find(function(type){return type.type == clickedType;});
        $(this).css('opacity', '0.3');
        //draw(63-currentPiece.getIndex());
        draw(currentPiece.getIndex());
        checkPieceSelection();
    });

    $('#save_team').click(function(){
        let teamName = prompt('Team name?');
        if (teamName){
            if (chessSettings.side == Side.LIGHT){
                savedTeams[teamName] = boardArray.slice(0,16).map(function(boardSlot){return boardSlot.piece.pokemon_type.type;});
            } else {
                //savedTeams[teamName] = boardArray.slice(48,64).reverse().map(function(boardSlot){return boardSlot.piece.pokemon_type.type;});
                savedTeams[teamName] = boardArray.slice(56,64).map(function(boardSlot){return boardSlot.piece.pokemon_type.type;});
                savedTeams[teamName] = savedTeams[teamName].concat(boardArray.slice(48,56).map(function(boardSlot){return boardSlot.piece.pokemon_type.type;}));
            }

            localStorage.setItem('savedTeams', JSON.stringify(savedTeams));
            loadSavedTeams();
        }
    });

    $('#saved_teams_table').on('click', '.select-team', function(){
        let selectedTeam = savedTeams[$(this).html()];
        chosenTypes = [...selectedTeam];
        currentPiece = null;
        $('#piece_choice').html('');
        $.each(selectedTeam, function(index, item){
            let pieceIndex = index;
            if (chessSettings.side === Side.DARK){
                if (index < 8){
                    pieceIndex = 56 + index;
                } else {
                    pieceIndex = 48 + index - 8;
                }
            }
            boardArray[pieceIndex].piece.pokemon_type = pokemon_types.find(function(type){return type.type == item;});
            draw(pieceIndex);
            checkPieceSelection();
        });
    });

    $('#saved_teams_table').on('click', '.delete-team', function(){
        if (confirm('Delete team?')){
            delete savedTeams[$(this).data('team')];
            localStorage.setItem('savedTeams', JSON.stringify(savedTeams));
            loadSavedTeams();
        }
    });

    $('#player_ready').click(function(){
        if ($(this).hasClass('unready')){
            $(this).removeClass('unready').addClass('ready');
            $(this).html('Unready <i class="fa fa-thumbs-down"></i>');
            $(this).blur();
            $('#piece_choice').html('');
            $('#piece_setup_div').addClass('hidden');
            chessSettings.ready = true;
            if (chessSettings.side === Side.LIGHT){
                socket.emit('ready', boardArray.slice(0,16).map(function(boardSlot){return boardSlot.piece.pokemon_type.type;}));
            } else {
                socket.emit('ready', boardArray.slice(48,64).reverse().map(function(boardSlot){return boardSlot.piece.pokemon_type.type;}));
            }
            if (chessSettings.enemyTypes){
                //startGame();
            }
        } else {
            $(this).addClass('unready').removeClass('ready');
            $(this).html('Ready <i class="fa fa-thumbs-up"></i>');
            $(this).blur();
            $('#piece_setup_div').removeClass('hidden');
            chessSettings.ready = false;
            socket.emit('unready');
        }
    });

    socket.on('nextPlayer', () => {
        if (chessSettings.lockPiece){
            //showMessage(chessSettings.enemyName + ' skipped!', 2000);
            chessSettings.lockPiece = false;
        }
        playAudio('plink',0.3);
        nextPlayer();
    });

    $('#skip_move').click(function(){
        $('#skip_move').addClass('hidden');
        currentPiece.clearValidMoves();
        chessSettings.lockPiece = false;
        playAudio('plink',0.3);
        nextPlayer();
        socket.emit('nextPlayer');
        socket.emit('hitClock');
    });

    socket.on('playerLeft', () => {
        //$('.board_message').addClass('hidden');
        $('#opponent_disconnected').removeClass('hidden');
        $('#game').css('pointer-events', '');
    });

    socket.on('playerReconnected', () => {
        $('#opponent_disconnected').addClass('hidden');
    });

    $('.toggle').click(function(){
        if ($(this).hasClass('fa-toggle-on')){
            $(this).removeClass('fa-toggle-on').addClass('fa-toggle-off');
        } else {
            $(this).addClass('fa-toggle-on').removeClass('fa-toggle-off');
        }
    });

    socket.on('startGame', () => {
        preloadMessages();
        startGame();
    });

    socket.on('timerUpdate', (hostRemaining, secondaryRemaining) => {
        console.log('host: ' + hostRemaining);
        console.log('second: ' + secondaryRemaining);
        if (chessSettings.host){
            chessSettings.playerRemaining = hostRemaining;
            chessSettings.enemyRemaining = secondaryRemaining;
        } else {
            chessSettings.playerRemaining = secondaryRemaining;
            chessSettings.enemyRemaining = hostRemaining;
        }
        clearInterval(chessSettings.clock);
        $('#player_clock').html(millisToClock(chessSettings.playerRemaining));
        $('#enemy_clock').html(millisToClock(chessSettings.enemyRemaining));
        hitClock();
    });

    $('.dismiss_update').click(function(){
        let update_date = $(this).data('date'),
            updates = JSON.parse(localStorage.getItem('updates'));
        if (!updates){
            updates = [];
        }
        updates.push(update_date);
        $('.update_div[data-date="'+update_date+'"]').addClass('hidden');
        localStorage.setItem('updates', JSON.stringify(updates));
    });

    socket.on('timerExpired', (loserSide) => {
        let otherSide = Side[loserSide] == Side.LIGHT ? Side.DARK : Side.LIGHT;
        gameOver(otherSide, 'by time');
    });

    socket.on('duplicateRoom', () => {
        alert('You are already hosting a room. Close that one before opening a new one!');
        window.close();
        location.reload();
    });

    $('#team_builder').click(function(){
        $('#setup_div').addClass('hidden');
        $('#game').removeClass('hidden');
        if (!boardArray[0]){
            setupGame();
        }
        chessSettings.side = Side.LIGHT;
        drawAll();
        $('#piece_setup_div').removeClass('hidden');
        $('.enemy_element').addClass('hidden');
        $('#switch_sides').removeClass('hidden');
        $('.team_builder').removeClass('hidden');
    });

    $('#switch_sides').click(function(){
        let currentTeam;
        let pieceCheck = function(boardSlot){
            if (boardSlot.piece.pokemon_type){
                let type = boardSlot.piece.pokemon_type.type;
                delete boardSlot.piece.pokemon_type;
                return type;
            } else {
                return '';
            }
        };
        if (chessSettings.side == Side.LIGHT){
            chessSettings.side = Side.DARK;
            $('.grid_numbers').css('flex-direction', 'column-reverse');
            $('.grid_letters').css('flex-direction', 'row-reverse');
            currentTeam = boardArray.slice(0,16).map(pieceCheck);
        } else {
            chessSettings.side = Side.LIGHT;
            $('.grid_numbers').css('flex-direction', 'column');
            $('.grid_letters').css('flex-direction', 'row');
            currentTeam = boardArray.slice(56,64).map(pieceCheck);
            currentTeam = currentTeam.concat(boardArray.slice(48,56).map(pieceCheck));
        }
        currentPiece = null;
        $('#piece_choice').html('');
        $.each(currentTeam, function(index, item){
            if (item){
                let pieceIndex = index;
                if (chessSettings.side === Side.DARK){
                    if (index < 8){
                        pieceIndex = 56 + index;
                    } else {
                        pieceIndex = 48 + index - 8;
                    }
                }
                boardArray[pieceIndex].piece.pokemon_type = pokemon_types.find(function(type){return type.type == item;});
            }
        });
        drawAll();
    });

    $('.back_menu').click(function(){
        backToMenu();
    });

    socket.on('badTypes', () => {
        alert('Fix your team, cheater...');
        $('#player_ready').click();
    });

    $('#forfeit_game').click(function(){
        if (confirm('Are you sure you want to forfeit?')){
            let otherSide = chessSettings.side == Side.LIGHT ? Side.DARK : Side.LIGHT;
            gameOver(otherSide, 'by forfeit');
            socket.emit('forfeit');
        }
    });

    socket.on('forfeit', (forfeitSide) => {
        let theSide = Side[forfeitSide] == Side.LIGHT ? Side.DARK : Side.LIGHT;
        gameOver(theSide, 'by forfeit');
    });

    socket.on('tooManyConnections', () => {
        alert('You have too many connections to the game server. Please end some before trying to load the website again.');
        $('#setup_div').addClass('hidden');
    });

    $('#copy_live').click(function(){
        if (confirm('Are you sure? This will overwrite your saved teams on the live site.')){
            let win = document.getElementById('ifr').contentWindow;
            win.postMessage(localStorage.getItem('savedTeams'), 'https://pokemonchess.com');
        }
    });

    $('#clear_team').click(function(){
        if (chessSettings.side === Side.LIGHT){
            boardArray.slice(0,16).forEach(function(square){delete square.piece.pokemon_type;});
        } else {
            boardArray.slice(48,64).forEach(function(square){delete square.piece.pokemon_type;});
        }
        chosenTypes.length = 0;
        $('.choose_type').css('opacity', '');
        drawAll();
    });
}

function playAudio(name, volume){
    console.log('audio: ' + name);
    if (name != 'check'){
        audios[name].pause();
        audios[name].currentTime = 0;
    }
    audios[name].play();
}

function startDraftTimer(){
    clearInterval(chessSettings.clock);
    $('#enemy_clock').html('Draft');
    $('#player_clock').html('3:00.0');
    chessSettings.draftStart = Date.now();
    startDraftInterval();
}

function startDraftInterval(){
    chessSettings.clock = setInterval(function(){
        let remainingTime = chessSettings.draftStart + 180000 - Date.now();

        $('#player_clock').html(millisToClock(remainingTime));
    }, 100);
}

function millisToClock(milliseconds){
    let minutes = Math.floor(milliseconds / 60000),
        seconds = Math.floor((milliseconds % 60000) / 1000),
        millis = Math.floor((milliseconds % 1000) / 100);
    minutes = (minutes < 10 ? '0' : '') + minutes;
    seconds = (seconds < 10 ? '0' : '') + seconds;
    return minutes + ':' + seconds + '.' + millis;
}

function rematch(){
    $('#win_message').addClass('hidden');
    $('#player_taken, #enemy_taken').html('');
    $('#promotion_choice').addClass('hidden');
    chessSettings.wait = false;
    if (!chessSettings.spectator){
        chessSettings.gameOver = false;
        chessSettings.enemyTypes = undefined;
        chessSettings.ready = false;
        previousPiece = undefined;
        chosenTypes = [];
        console.log('about to set started to false!');
        chessSettings.started = false;
        setupGame();
        if (chessSettings.random_teams){
            chessSettings.draftOver = true;
            $('#player_ready').removeClass('ready').addClass('unready');
            $('#randomise_missing').click();
        } else {
            chessSettings.draftOver = false;
            $('#player_ready').addClass('unready hidden').removeClass('ready');
            $('#player_ready').html('Ready <i class="fa fa-thumbs-up"></i>');
            $('#enemy_ready').addClass('unready').removeClass('ready hidden').html('Unready <i class="fa fa-thumbs-down"></i>');
            $('#piece_setup_div').removeClass('hidden');
            startDraftTimer();
        }
        if (chessSettings.host){
            socket.emit('syncSpectators', boardArray, chessSettings, currentPlayer, $('#player_taken').html(), $('#enemy_taken').html());
        }
    } else {
        console.log('is a spectator?!');
    }
}

function showMessage(message, time){
    $('#mid_board').html(message).removeClass('hidden');
    if (time){
        setTimeout(function(){
            $('#mid_board').addClass('hidden');
        }, time);
    }
}

function startGame(){
    console.log('STARTING GAME!');
    $('#forfeit_game').removeClass('hidden');
    chessSettings.startTime = Date.now();
    $('#mid_board').html('');
    $('#enemy_ready, #player_ready').addClass('hidden');
    $.each(chessSettings.enemyTypes, function(index, item){
        let pieceIndex = index;
        if (chessSettings.side === Side.LIGHT){
            pieceIndex = 63 - pieceIndex;
        }
        boardArray[pieceIndex].piece.pokemon_type = pokemon_types.find(function(type){return type.type == item;});
        draw(pieceIndex);
    });
    chessSettings.started = true;
    if (chessSettings.side == Side.DARK){
        socket.emit('hitClock');
    }
    //if (chessSettings.side === Side.LIGHT){
    //chessSettings.playerStart = Date.now();
    //} else {
    //chessSettings.enemyStart = Date.now();
    //}
    /*chessSettings.playerRemaining = 600000;
    chessSettings.enemyRemaining = 600000;
    if (chessSettings.clock){
        clearInterval(chessSettings.clock);
    }*/
    //$('#enemy_clock, #player_clock').html('10:00.0');
    //hitClock();
    if (chessSettings.host && !chessSettings.spectator){
        socket.emit('syncSpectators', boardArray, chessSettings, currentPlayer, $('#player_taken').html(), $('#enemy_taken').html());
    }
}

function hitClock(noSet){
    console.log('clock hit');
    if (chessSettings.gameOver){
        return;
    }
    /*if (chessSettings.clock){
        clearInterval(chessSettings.clock);
        if (currentPlayer !== chessSettings.side && !noSet){
            chessSettings.playerRemaining = chessSettings.playerRemaining - (Date.now() - chessSettings.playerStart);
            chessSettings.enemyStart = Date.now();
        } else if (!noSet) {
            chessSettings.enemyRemaining = chessSettings.enemyRemaining - (Date.now() - chessSettings.enemyStart);
            chessSettings.playerStart = Date.now();
        }
    }*/

    let id = '#player_clock';
    if (currentPlayer !== chessSettings.side){
        id = '#enemy_clock';
    }
    chessSettings.clockStart = Date.now();
    console.log(id);
    chessSettings.clock = setInterval(function(){
        let remainingTime;
        if (id === '#player_clock'){
            remainingTime = chessSettings.playerRemaining - (Date.now() - chessSettings.clockStart);
        } else {
            remainingTime = chessSettings.enemyRemaining - (Date.now() - chessSettings.clockStart);
        }

        chessSettings.currentRemaining = remainingTime;

        /*if (remainingTime <= 0){
            let winnerName = chessSettings.side == currentPlayer ? chessSettings.enemyName : chessSettings.playerName;
            $('#winner_name').html(winnerName + ' wins!');
            $('#rematch_wanted').html('');
            $('#win_message').removeClass('hidden');
            chessSettings.gameOver = true;
            $(id).html('00:00.0');
            clearInterval(chessSettings.clock);
            return;
        }*/

        $(id).html(millisToClock(remainingTime));
    }, 100);
}

function gameOver(winnerSide, reason){
    let winnerName, incrementString;
    if (chessSettings.side == winnerSide){
        winnerName = chessSettings.playerName;
        incrementString = 'wins';
    } else {
        winnerName = chessSettings.enemyName;
        incrementString = 'losses';
    }
    if (localStorage.getItem(incrementString)){
        let oldValue = parseInt(localStorage.getItem(incrementString));
        oldValue++;
        localStorage.setItem(incrementString, oldValue);
    } else {
        localStorage.setItem(incrementString, 1);
    }
    $('#winner_name').html(winnerName + ' wins ' + reason + '!');
    $('#rematch_wanted').html('');
    $('#win_message').removeClass('hidden');
    chessSettings.gameOver = true;
    chessSettings.lockPiece = false;
    clearInterval(chessSettings.clock);
    audios.check.pause();
    $('#skip_move').addClass('hidden');
}

function showGif(message, pieceType){
    console.log('gif: ' + message);
    let id = '#player_gif';
    if (chessSettings.side !== currentPlayer){
        id = '#enemy_gif';
    }
    let prepend = '';
    if (pieceType){
        prepend = pieceType + '%20';
    }
    $(id).find('img').attr('src', '');
    $(id).find('img').attr('src', 'gifs/'+prepend+message+'.gif');
    $(id).removeClass('hidden');
    setTimeout(function(){
        $(id).addClass('hidden');
    }, 2000);
}

function GamePiece(typeEnum, sideEnum) {
    this.type = typeEnum;
    this.side = sideEnum;
    /*if (this.side.name == 'Light'){
        this.pokemon_type = pokemon_types[~~(Math.random() * 18)];
    }*/

    this.firstMove = true;
    var validMoves = [];

    this.clearValidMoves = function() {
        for(var i = 0; i < validMoves.length; i++) {
            var index = validMoves[i];
            boardArray[index].border = boardArray[index].bg;
            draw(index);
        }
    };
    this.getIndex = function() {
        for(var i = 0; i < boardArray.length; i++) {
            if(boardArray[i].piece === this) {
                return i;
            }
        }
    };
    this.getValidMoves = function() { return validMoves; };
    this.isValidMove = function(targetIndex) {
        if (!Array.isArray(validMoves)) return false;
        var index = validMoves.indexOf(targetIndex);
        if(index > -1) {
            //console.log(targetIndex + " is a valid move.");
            return true;
        } else {
            //console.log(targetIndex + " is not a valid move.");
            return false;
        }
    };
    this.move = function(targetIndex, hitType, keepTurn) {
        audios.check.pause();

        let takenLocation = this.side == chessSettings.side ? '#player_taken' : '#enemy_taken',
            otherLocation = takenLocation == '#player_taken' ? '#enemy_taken' : '#player_taken',
            takenType,
            takenPokeType;

        let otherSide = this.side == Side.LIGHT ? Side.DARK : Side.LIGHT;

        let takenPiece;

        // First remove fill from previous piece and it's old location
        //if (previousPiece){
        if (previousPiece && boardArray.find(function(space){return space.piece == previousPiece;})){
            //boardArray[previousPiece.oldIndex].justLeft = false;
            draw(previousPiece.oldIndex);
            let previousIndex = previousPiece.getIndex();
            if (this.type == 'pawn'){ // en passant?
                takenType = previousPiece.type;
                if (chessSettings.enPassant == targetIndex && hitType != 'miss' && hitType != 'none'){
                    console.log('did en passant!');
                    takenPiece = boardArray[previousIndex].piece;
                    takenType = previousPiece.type;
                    takenPokeType = previousPiece.pokemon_type.type;
                    boardArray[previousPiece.getIndex()].piece = null;
                }
            }
            previousPiece.oldIndex = undefined;
            draw(previousIndex);
        }

        chessSettings.enPassant = undefined;
        chessSettings.wait = false;
        chessSettings.lockPiece = false;
        chessSettings.critical = false;

        var oldIndex = this.getIndex();
        if (!takenPiece){
            takenPiece = boardArray[targetIndex].piece;
            if (takenPiece){
                takenType = takenPiece.type;
            }
        }

        if (hitType == 'miss' || hitType == 'none'){
            if (hitType == 'miss'){
                playAudio('missed');
                showGif('missed', this.type);
            } else {
                playAudio('nope');
                showGif('none', takenType);
            }
            //boardArray[targetIndex].justLeft = true;
            chessSettings.highlight.push(targetIndex);
            this.oldIndex = targetIndex;
            previousPiece = this;
            this.clearValidMoves();
            draw(oldIndex);
            draw(targetIndex);
            if (chessSettings.side == currentPlayer){
                socket.emit('hitClock');
            }
            nextPlayer();
            return;
        }

        this.firstMove = false;

        boardArray[targetIndex].piece = this;
        boardArray[oldIndex].piece = null;
        //boardArray[oldIndex].justLeft = true;
        chessSettings.highlight.push(oldIndex);
        this.oldIndex = oldIndex;
        previousPiece = this;

        let effectiveness = 'Normal effect.';
        let critical = hitType == 'critical';
        if (takenPiece){
            takenPokeType = takenPiece.pokemon_type.type;
            if (critical){
                chessSettings.critical = true;
                //showMessage('Critical!', 2000);
                showGif('critical');
                this.clearValidMoves();
                this.setValidMoves();
                playAudio('critical');
                chessSettings.lockPiece = true;
            } else if (this.pokemon_type.not.includes(takenPiece.pokemon_type.type)){
                //showMessage('Not very effective!', 2000);
                showGif('not-very');
                effectiveness = 'Not Very Effective! You lose your piece too.';
                boardArray[targetIndex].piece = null;
                let pokemon_image = this.type + '%20' + this.pokemon_type.type + '.png';
                if (this.type == 'pawn'){
                    pokemon_image = pokemon_image.replace('pawn', 'pawn' + this.side.file[0]);
                } else if (this.promotion){
                    pokemon_image = 'promote' + this.side.file[0] + '%20' + this.pokemon_type.type + '.png';
                } else if (this.type == 'king') {
                    gameOver(otherSide, 'by king not very effective death');
                }
                $(otherLocation).append('<div style="background-image:url(\'img/'+this.type+'%20'+this.side.file+'.png\')"><img src="img/' + pokemon_image + '" /></div>');
                //boardArray[oldIndex].justLeft = false;
                previousPiece = null;
                playAudio('not-very');
            } else if (this.pokemon_type.super.includes(takenPiece.pokemon_type.type)){
                chessSettings.critical = true;
                critical = true;
                showGif('super');
                //showMessage('Super Effective!', 2000);
                effectiveness = 'Super Effective! Go again.';
                this.clearValidMoves();
                this.setValidMoves();
                playAudio('super');
                chessSettings.lockPiece = true;
            } else {
                playAudio('plink',0.3);
            }
        } else {
            playAudio('plink',0.3);
            takenType = undefined;
        }

        if (chessSettings.lockPiece && currentPlayer == chessSettings.side && !chessSettings.spectator){
            $('#skip_move').removeClass('hidden');
        } else {
            $('#skip_move').addClass('hidden');
        }

        // Redraw gamepieces
        /*draw(oldIndex);
        draw(targetIndex);*/
        drawAll();

        if (takenType){
            let pokemon_image = takenType + '%20' + takenPokeType + '.png';
            if (takenType == 'pawn'){
                pokemon_image = pokemon_image.replace('pawn', 'pawn' + otherSide.file[0]);
            } else if (takenPiece.promotion){
                pokemon_image = 'promote' + otherSide.file[0] + '%20' + takenPokeType + '.png';
            }
            $(takenLocation).append('<div style="background-image:url(\'img/'+takenType+'%20'+otherSide.file+'.png\')"><img src="img/' + pokemon_image + '" /></div>');
            if (takenType == 'king'){
                gameOver(currentPlayer, 'by taking the king');
            }
        }

        // Check for pawn promotion
        let promotion = false;
        if (this.type == 'pawn' && previousPiece){
            if (getY(targetIndex) == 0 || getY(targetIndex) == 7){
                promotion = true;
                if (this.side == chessSettings.side && !chessSettings.spectator){
                    chessSettings.wait = true;
                    $('#promotion_choice').html($('#promotion_choice').html().split(otherSide.file).join(this.side.file));
                    $('#promotion_choice').removeClass('hidden');
                }
            }
        }

        // Finished moving, clean-up
        this.clearValidMoves();
        console.log("Finished moving, cleaning-up.");
        if (critical && chessSettings.side == currentPlayer){
            if ($('#skip_move_hint').length){
                $('#skip_move_hint').removeClass('hidden');
                setTimeout(function(){
                    $('#skip_move_hint').remove();
                }, 3000);
            }
            this.showValidMoves();
        }
        if (!critical && !promotion && !keepTurn && !chessSettings.gameOver){
            if (chessSettings.side == currentPlayer){
                socket.emit('hitClock');
            }
            nextPlayer();
        }

    };
    this.showValidMoves = function() {
        console.log("Valid moves for", this.getIndex(), validMoves);
        for(var i = 0; i < validMoves.length; i++) {
            var index = validMoves[i];
            if(boardArray[index].piece) {
                if(boardArray[index].piece.side == currentPlayer) {
                    boardArray[index].border = "rgb(0,0,200)";
                } else {
                    boardArray[index].border = "rgb(200,0,0)";
                }
            } else {
                boardArray[index].border = "rgb(0,200,0)";
            }
            draw(index);
        }
    };
    this.setValidMoves = function() {
        var index = this.getIndex(),
            originX = getX(index),
            originY = getY(index),
            sideMod = this.side.value,
            firstMove = this.firstMove;

        validMoves = [];

        // Push index of unit to validMoves array
        switch(this.type) {
            case Type.PAWN:
                /* Check for valid attacks */
                checkMove(this, 1, 1, Flag.ATTACK);
                checkMove(this, -1, 1, Flag.ATTACK);

                /* Check for valid moves */
                if(this.firstMove) {
                    checkMove(this, 0, 1, Flag.PASSIVE, 2);
                } else {
                    checkMove(this, 0, 1, Flag.PASSIVE, 1);
                }
                break;
            case Type.ROOK:
                /* Rooks move in a straight line, attacks are the same. Special move called Castling is available */
                checkMove(this, 0, 1, Flag.NONE, 8);
                checkMove(this, 0, -1, Flag.NONE, 8);
                checkMove(this, 1,0,Flag.CASTLE,8);
                checkMove(this, -1,0,Flag.CASTLE,8);
                break;
            case Type.KNIGHT:
                checkMove(this, 2, 1);
                checkMove(this, 2, -1);
                checkMove(this, -2, 1);
                checkMove(this, -2, -1);
                checkMove(this, 1, 2);
                checkMove(this, 1, -2);
                checkMove(this, -1, 2);
                checkMove(this, -1, -2);
                break;
            case Type.BISHOP:
                checkMove(this, 1, 1, Flag.NONE, 8); // SE
                checkMove(this, 1, -1, Flag.NONE, 8); // NE
                checkMove(this, -1, 1, Flag.NONE, 8); // SW
                checkMove(this, -1, -1, Flag.NONE, 8); // NW
                break;
            case Type.QUEEN:
                checkMove(this, 0, -1, Flag.NONE, 8); // N
                checkMove(this, 0, 1, Flag.NONE, 8); // S
                checkMove(this, 1, 0, Flag.NONE, 8); // E
                checkMove(this, -1, 0, Flag.NONE, 8); // W
                checkMove(this, 1, 1, Flag.NONE, 8); // SE
                checkMove(this, 1, -1, Flag.NONE, 8); // NE
                checkMove(this, -1, 1, Flag.NONE, 8); // SW
                checkMove(this, -1, -1, Flag.NONE, 8); // NW
                break;
            case Type.KING:
                checkMove(this, 0, -1, Flag.NONE); // N
                checkMove(this, 0, 1, Flag.NONE); // S
                checkMove(this, 1, 0, Flag.NONE); // E
                checkMove(this, -1, 0, Flag.NONE); // W
                checkMove(this, 1, 1, Flag.NONE); // SE
                checkMove(this, 1, -1, Flag.NONE); // NE
                checkMove(this, -1, 1, Flag.NONE); // SW
                checkMove(this, -1, -1, Flag.NONE); // NW
                // castling
                checkMove(this, 1, 0, Flag.KING, 4); // E
                checkMove(this, -1, 0, Flag.KING, 4); // W
                break;
        }

        function checkMove(thisPiece, stepX, stepY, flag = Flag.NONE, maxSteps = 1) {
            MoveLoop:
                for(var i = 1; i <= maxSteps; i++) {
                    var targetX = originX + stepX * i;
                    var targetY = originY + stepY * i * sideMod;
                    if(targetX >= 0 && targetX <= 7 && targetY >= 0 && targetY <= 7) {
                        var targetIndex = getIndex(targetX, targetY);
                        var targetPiece = boardArray[targetIndex].piece;
                        switch (flag) {
                            case Flag.ATTACK:
                                if(targetPiece && targetPiece.side != thisPiece.side) {
                                    validMoves.push(targetIndex);
                                    if (targetPiece.type == Type.KING && targetPiece.side == chessSettings.side && targetPiece.side == currentPlayer){
                                        console.log('angy pawn');
                                        playAudio('check', 0.2);
                                    }
                                }
                                if (previousPiece){
                                    if (thisPiece.side == Side.LIGHT && getY(thisPiece.getIndex()) == 4){
                                        let nextToIndex = getIndex(targetX, originY),
                                            nextToPiece = boardArray[nextToIndex].piece;
                                        if (nextToPiece == previousPiece && previousPiece.type == 'pawn' && previousPiece.oldIndex == previousPiece.getIndex() + 16){
                                            chessSettings.enPassant = targetIndex;
                                            validMoves.push(targetIndex);
                                        }
                                    } else if (thisPiece.side == Side.DARK && getY(thisPiece.getIndex()) == 3){
                                        let nextToIndex = getIndex(targetX, originY),
                                            nextToPiece = boardArray[nextToIndex].piece;
                                        if (nextToPiece == previousPiece && previousPiece.type == 'pawn' && previousPiece.oldIndex == previousPiece.getIndex() - 16){
                                            chessSettings.enPassant = targetIndex;
                                            validMoves.push(targetIndex);
                                        }
                                    }
                                }
                                break;
                            case Flag.PASSIVE:
                                if (targetPiece){
                                    break MoveLoop;
                                } else {
                                    validMoves.push(targetIndex);
                                }
                                break;
                            case Flag.KING:
                                if (targetPiece){
                                    if (targetPiece.type !== Type.ROOK || targetPiece.side != currentPlayer){
                                        break MoveLoop;
                                    } else if (firstMove && targetPiece.firstMove){
                                        validMoves.push(targetIndex);
                                        validMoves.push(getIndex(originX+stepX+stepX, targetY));
                                        break MoveLoop;
                                    }
                                }
                                break;
                            case Flag.CASTLE:
                                if(targetPiece && firstMove && targetPiece.firstMove && targetPiece.type == Type.KING && targetPiece.side == currentPlayer) {
                                    validMoves.push(targetIndex);
                                    break MoveLoop;
                                }
                            default:
                                if(targetPiece) {
                                    if(targetPiece.side == thisPiece.side) {
                                        break MoveLoop;
                                    } else {
                                        validMoves.push(targetIndex);
                                        if (targetPiece.type == Type.KING && targetPiece.side == chessSettings.side && targetPiece.side == currentPlayer){
                                            console.log('check by:');
                                            console.log(thisPiece);
                                            playAudio('check', 0.2);
                                        }

                                        break MoveLoop;
                                    }
                                } else {
                                    validMoves.push(targetIndex);
                                }
                        }
                    } else {
                        break MoveLoop;
                    }
                }
        }
    };
}
function draw(index, flip) {
    console.log('draw ' + index);
    let flippedIndex = index;
    if (chessSettings.side === Side.LIGHT){
        index = 63 - index;
        flippedIndex = 63 - index;
    }

    // Draw square specified by index
    var x = getX(index),
        y = getY(index),
        fill = boardArray[flippedIndex].bg,
        border = boardArray[flippedIndex].border,
        img = boardArray[flippedIndex].piece,
        strokeWidth = 2;

    if (chessSettings.highlight.includes(flippedIndex)){
        context.fillStyle = '#bec858';
    } else if (boardArray[flippedIndex].justLeft){
        context.fillStyle = '#bec858';
    } else if (img && (img.oldIndex || img.oldIndex == 0)){
        context.fillStyle = '#bec858';
    } else {
        context.fillStyle = fill;
    }

    context.fillRect(x * boardSpace, y * boardSpace, boardSpace, boardSpace);
    if (img) {
        context.drawImage(images[img.side.file+'_'+img.type], x * boardSpace, y * boardSpace, boardSpace, boardSpace);

        /*context.fillStyle = img.colour;
        context.beginPath();
        context.arc(x * boardSpace + 50, y * boardSpace + 50, 10, 0, Math.PI * 2);
        context.fill();*/
        if (img.pokemon_type){
            let pokemon_image;
            if (img.type == 'pawn'){
                pokemon_image = 'pawn' + img.side.file[0] + '_' + img.pokemon_type.type;
                context.drawImage(images[pokemon_image], x * boardSpace-2, y * boardSpace-2, boardSpace+4, boardSpace+4);
            } else {
                if (img.promotion){
                    pokemon_image = 'promote' + img.side.file[0] + '_' + img.pokemon_type.type;
                } else {
                    pokemon_image = img.type + '_' + img.pokemon_type.type;
                }
                context.drawImage(images[pokemon_image], x * boardSpace, y * boardSpace, boardSpace, boardSpace);
            }

        }

        if (currentPiece == img){
            border = '#3498db';
        }

        /*const imgData = context.getImageData(x * boardSpace, y * boardSpace, boardSpace, boardSpace);
        for (let i = 0; i < imgData.data.length; i += 4) {
            if (imgData.data[i] === 0 && imgData.data[i+1] === 0 && imgData.data[i+2] === 0){
                imgData.data[i] = 255;
            }
        }
        context.putImageData(imgData, x * boardSpace, y * boardSpace);*/
    }
    context.strokeStyle = border;
    context.lineWidth = strokeWidth;
    context.strokeRect(x * boardSpace + (strokeWidth/2), y * boardSpace + (strokeWidth/2), boardSpace - strokeWidth, boardSpace - strokeWidth);
}
function getClick(event) {
    const rect = canvas.getBoundingClientRect();
    /*var canvasLeft = canvas.offsetLeft,
        canvasTop = canvas.offsetTop,
        x = event.pageX - canvasLeft,
        y = event.pageY - canvasTop,*/
    var x = event.clientX - rect.left,
        y = event.clientY - rect.top,
        xIndex = Math.floor(x / boardSpace),
        yIndex = Math.floor(y / boardSpace),
        clickIndex = xIndex + (yIndex * 8);

    if (chessSettings.side === Side.LIGHT){
        clickIndex = 63 - clickIndex;
    }

    return clickIndex;
}
function getScreenshot() {
    var dataURL = canvas.toDataURL();
    var dataImg = document.createElement('img');
    dataImg.src = dataURL;
    document.body.insertBefore(dataImg, canvas);
}
function getIndex(x, y) {
    var index = x + y * 8;
    return index;
}
function getX(index) {
    var x = index % 8;
    return x;
}
function getY(index) {
    var y = Math.floor(index / 8);
    return y;
}
function isOdd(num) {
    return (num % 2) == 1;
}
function nextPlayer() {
    $('#skip_move').addClass('hidden');
    chessSettings.highlight.length = 0;
    console.log("Current player is: " + currentPlayer + ". Setting next player.");
    if(currentPiece) {
        currentPiece = null;
    }
    switch(currentPlayer) {
        case Side.LIGHT:
            currentPlayer = Side.DARK;
            break;
        case Side.DARK:
            currentPlayer = Side.LIGHT;
            break;
        default:
            currentPlayer = Side.LIGHT;
    }
    console.log("Current player set to " + currentPlayer);
    for(var i = 0; i < boardArray.length; i++) {
        var piece = boardArray[i].piece;
        if(piece) {
            piece.setValidMoves();
        }
    }
    console.log("Current player is " + currentPlayer.name);
    if (chessSettings.started){
        /*if (chessSettings.playerStart && !chessSettings.enemyStart){
            chessSettings.enemyStart = Date.now();
        } else if (chessSettings.enemyStart && !chessSettings.playerStart){
            chessSettings.playerStart = Date.now();
        }*/
        //hitClock();
    }

}
function selectPiece(event) {
    if (chessSettings.spectator || chessSettings.gameOver){
        return;
    }

    var boardIndex = getClick(event);
    console.log(boardIndex);
    var selectedPiece = boardArray[boardIndex].piece;

    if (!chessSettings.started){
        if (chessSettings.ready){
            return;
        }
        if (selectedPiece && selectedPiece.side != chessSettings.side){
            selectedPiece = null;
        }

        let oldIndex;
        if (currentPiece){
            oldIndex = currentPiece.getIndex();
            //oldIndex = 63 - oldIndex;
        }

        currentPiece = selectedPiece;
        if (oldIndex || oldIndex == 0){
            draw(oldIndex);
        }
        //let drawIndex = 63 - boardIndex;
        draw(boardIndex);

        $('#piece_choice').html('');
        if (currentPiece){
            let pieceType = currentPiece.type;
            if (pieceType == 'pawn'){
                pieceType = pieceType + currentPiece.side.file[0];
            }
            for (const pokemon_type of pokemon_types){
                if (pokemon_types.indexOf(pokemon_type) % 6 == 0){
                    $('#piece_choice').append('<br />');
                }
                let imgStyle = '';
                if (chosenTypes.includes(pokemon_type.type)){
                    imgStyle = 'style="opacity:0.3;" ';
                }
                $('#piece_choice').append('<img ' + imgStyle + 'class="choose_type pointer" data-type="'+pokemon_type.type+'" width="100px" height="100px" src="' + images[pieceType+'_'+pokemon_type.type].src + '" />');
            }
        }
    } else if (currentPlayer !== chessSettings.side){
        console.log('It is the opponents turn.');
    } else if (chessSettings.wait){
        console.log('Please wait.');
    } else if(currentPiece && selectedPiece) {
        if (selectedPiece.side == currentPlayer) {
            if(currentPiece.type == "rook" && selectedPiece.type == "king" && currentPiece.isValidMove(boardIndex)) {
                if (currentPiece.getIndex() > boardIndex){
                    socket.emit('castle', currentPiece.getIndex(), currentPiece.getIndex() - 3, boardIndex, boardIndex+2);
                } else {
                    socket.emit('castle', currentPiece.getIndex(), currentPiece.getIndex() + 2, boardIndex, boardIndex-2);
                }
            } else if (currentPiece.type == "king" && selectedPiece.type == "rook" && currentPiece.isValidMove(boardIndex)){
                if (currentPiece.getIndex() > boardIndex){
                    socket.emit('castle', boardIndex, boardIndex + 2, currentPiece.getIndex(), currentPiece.getIndex() - 2);
                } else {
                    socket.emit('castle', boardIndex, boardIndex - 3, currentPiece.getIndex(), currentPiece.getIndex() + 2);
                }
            } else {
                if (!chessSettings.lockPiece){
                    setCurrentPiece(boardIndex);
                }
            }
        } else if(currentPiece.isValidMove(boardIndex)) {
            //currentPiece.move(boardIndex);
            if (currentPiece.pokemon_type.none.includes(selectedPiece.pokemon_type.type)){
                socket.emit('normalMove', currentPiece.getIndex(), boardIndex, 'none');
                currentPiece.move(boardIndex, 'none');
                /*showMessage('No effect!', 2000);
                playAudio('nope');
                currentPiece.clearValidMoves();
                nextPlayer();
                socket.emit('nextPlayer');*/
            } else {
                socket.emit('attemptTake', currentPiece.getIndex(), boardIndex);
                chessSettings.wait = true;
            }

        } else {
            console.log("Invalid selection. Move along.");
            if (!chessSettings.lockPiece){
                setCurrentPiece();
            }
        }
    } else if (currentPiece) {
        if(currentPiece.isValidMove(boardIndex)) {
            // Is the king trying to move 2 spaces (castle)?
            if (currentPiece.type == Type.KING && currentPiece.getIndex() - boardIndex == 2){
                socket.emit('castle', currentPiece.getIndex()-3, currentPiece.getIndex()-1, currentPiece.getIndex(), boardIndex);
            } else if (currentPiece.type == Type.KING && currentPiece.getIndex() - boardIndex == -2){
                socket.emit('castle', currentPiece.getIndex()+4, currentPiece.getIndex()+1, currentPiece.getIndex(), boardIndex);
            } else if (currentPiece.type == Type.PAWN && chessSettings.enPassant == boardIndex){
                // See if it actually has effect
                if (currentPiece.pokemon_type.none.includes(previousPiece.pokemon_type.type)){
                    socket.emit('normalMove', currentPiece.getIndex(), boardIndex, 'none');
                    currentPiece.move(boardIndex, 'none');
                } else {
                    socket.emit('attemptTake', currentPiece.getIndex(), boardIndex);
                    chessSettings.wait = true;
                }
            } else {
                console.log("Valid move, moving piece.");
                console.log('normal move: ' + currentPiece.getIndex() + ' ' + boardIndex);
                socket.emit('normalMove', currentPiece.getIndex(), boardIndex);
                currentPiece.move(boardIndex);
            }
        } else {
            console.log("Not a valid move. Move along.");
            if (!chessSettings.lockPiece){
                setCurrentPiece();
            }
        }
    } else if (selectedPiece) {
        if(selectedPiece.side == currentPlayer && !chessSettings.lockPiece) {
            console.log("Changing current piece.");
            setCurrentPiece(boardIndex);
        } else {
            console.log("Please select a valid piece.");
        }
    } else {
        console.log("No valid selection. Move along.");
    }
}
function setCurrentPiece(boardIndex = -1) {
    console.log("Setting Current Piece to index:", boardIndex);
    let oldIndex;
    if(currentPiece) {
        oldIndex = currentPiece.getIndex();
        currentPiece.clearValidMoves();
    }
    if(boardIndex >= 0) {
        currentPiece = boardArray[boardIndex].piece;
        currentPiece.showValidMoves();
        // Redraw piece to show border
        draw(boardIndex);
    } else {
        currentPiece = null;
    }
    if (oldIndex >= 0){
        // Redraw old index to remove border
        draw(oldIndex);
    }
}
function setupBoard() {
    /* Set background color for each square on a board set up in an 8x8 grid */
    /* Default border is the same as background */
    for (var i = 0; i < boardArray.length; i++) {
        boardArray[i] = {};

        var row = getY(i);
        //var fill = "rgb(50,50,50)";
        var fill = '#ebecd0';
        if (isOdd(i + row)) {
            //fill = "rgb(255,255,255)";
            fill = '#779556';
        }

        boardArray[i].border = fill;
        boardArray[i].bg = fill;
    }
}
function drawAll(){
    for (let i = 0; i < boardArray.length; i++) {
        draw(i);
    }
}
function setAllValidMoves(){
    for (let i = 0; i < boardArray.length; i++) {
        if (boardArray[i].piece){
            boardArray[i].piece.clearValidMoves();
            boardArray[i].piece.setValidMoves();
        }
    }
}
function setupGame() {
    // Initializes or resets initial variables
    currentPlayer = null;

    console.log("Setting up board");
    setupBoard();
    console.log("Setting up pieces.");
    setupPieces();
    console.log("Drawing board.");
    drawAll();
    canvas.addEventListener('click', selectPiece, false);
    nextPlayer();

    $('#types').html('');
    for (let i = 0; i < pokemon_types.length; i++){
        $('#types').append('<span style="color:white;display:inline-block;border-radius:5px;padding:5px;background-color:'+pokemon_types[i].colour + '">' + pokemon_types[i].type + '</span>');
    }

    loadSavedTeams();
}

function checkPieceSelection(){
    if (chosenTypes.length == 16){
        $('#save_team, #player_ready').removeClass('hidden');
        if (!$('#switch_sides').hasClass('hidden')){
            $('#player_ready').addClass('hidden');
        }
    } else {
        $('#save_team, #player_ready').addClass('hidden');
    }
}

function loadSavedTeams(){
    if (localStorage.getItem('savedTeams')){
        savedTeams = JSON.parse(localStorage.getItem('savedTeams'));
        $('#saved_teams_table tbody').html('');
        for (const team in savedTeams){
            $('#saved_teams_table tbody').append('<tr><td class="pointer select-team">' + team + '</td><td><i data-team="' + team + '" class="pointer fa fa-trash delete-team"></i></td>');
        }
    } else {
        $('#saved_teams_table tbody').html('<tr><td colspan="100%">You have no saved teams.</td></tr>');
    }
}

function setupPieces() {
    // initialize game pieces
    for (var i = 0; i < boardArray.length; i++) {
        var row = getY(i),
            column = getX(i),
            side = null,
            type = null;

        switch (row) {
            case 0:
                switch (column) {
                    case 0:
                    case 7:
                        type = Type.ROOK;
                        break;
                    case 1:
                    case 6:
                        type = Type.KNIGHT;
                        break;
                    case 2:
                    case 5:
                        type = Type.BISHOP;
                        break;
                    case 3:
                        type = Type.KING;
                        break;
                    case 4:
                        type = Type.QUEEN;
                        break;
                }
                side = Side.LIGHT;
                break;
            case 1:
                type = Type.PAWN;
                side = Side.LIGHT;
                break;
            case 6:
                type = Type.PAWN;
                side = Side.DARK;
                break;
            case 7:
                switch (column) {
                    case 0:
                    case 7:
                        type = Type.ROOK;
                        break;
                    case 1:
                    case 6:
                        type = Type.KNIGHT;
                        break;s
                    case 2:
                    case 5:
                        type = Type.BISHOP;
                        break;
                    case 3:
                        type = Type.KING;
                        break;
                    case 4:
                        type = Type.QUEEN;
                        break;
                }
                side = Side.DARK;
                break;
        }
        if (type) {
            boardArray[i].piece = new GamePiece(type, side);
        }
    }
}

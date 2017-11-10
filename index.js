const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const ejs = require('ejs');
const path = require('path');
// const tokens = require('./tokens');

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/views'));

let musicBotSocket = io.of('/musicBot');
let musicWebSocket = io.of('/web');

let musicBotData = {
    musicbotOnline: "offline",
    voiceChannel: 'no channel',
    songCurrent: 'Nothing'
}

app.get('/', function(req, res){
    res.render('index.ejs');
    //res.redirect('https://manager.linode.com/')
});
app.get('/music', function(req, res){
    res.render('music.ejs', musicBotData);
});

io.on('connection', () => {
    console.log("Connection!");
});

musicWebSocket.on('connection', socket => {
    socket.emit('handshake',musicBotData)
    socket.on('musicBotJoin', id => {
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicBotJoin', id);
    });
    socket.on('musicBotSkip', id => {
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicBotSkip', id);
    });
    socket.on('musicBotNuke', id => {
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicBotNuke', id);
    });
    socket.on('musicSongSearch', song => {
        if (song.length == 0) {socket.emit('botFail', 'Search cannot be empty');return;}
        if (musicBotData.voiceChannel == 'no channel') {socket.emit('botFail', 'Bot is not in a voice channel');return;}
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicSongSearch', song);
    });
})
musicBotSocket.on('connection', socket => {
    socket.on('botStateUpdate', state => {
        musicBotData.musicbotOnline = state;
        musicWebSocket.emit('botStateUpdate', musicBotData.musicbotOnline)
        console.log("Bot online state: " + musicBotData.musicbotOnline);
    });
    socket.on('botChannelUpdate', name => {
        musicBotData.voiceChannel = name;
        musicWebSocket.emit('botChannelUpdate', name)
    });
    socket.on('songCurrent', song => {
        musicBotData.songCurrent = song;
        musicWebSocket.emit('songCurrent', song)
    });
    socket.on('botFail', fail => {
        musicWebSocket.emit('botFail', fail);
    });
    socket.on('botInfo', info => {
        musicWebSocket.emit('botInfo', info);
    });
    socket.on('disconnect', () => {
        musicBotData.musicbotOnline = "offline";
        musicBotData.voiceChannel = 'no channel';
    });
});

http.listen(process.env.PORT || 8080, '0.0.0.0', function(){
    console.log('listening on purvaldur.dk');
});

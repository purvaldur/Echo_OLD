const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const ejs = require('ejs')
const path = require('path')
const fs = require('fs')
// const tokens = require('./tokens')

app.use(express.static('public'))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'public/views'))

let musicBotSocket = io.of('/musicBot')
let musicWebSocket = io.of('/web')

let musicWebData = JSON.parse(fs.readFileSync(__dirname + '/musicWebData.json', 'utf8'))
let songProgress = null
let musicBotData = {
    musicbotOnline: "offline",
    voiceChannel: 'no channel',
    songCurrent: {
        albumArt: null,
        time: null,
        meta: {
            title: null,
            artist: null,
            album: null
        },
        selector: {
            avatar: null,
            name: null
        }
    },
    progress: {
        width: "0px",
        time: 0
    },
    queue: {
        queue: [],
        type: null
    }
}

app.get('/', function(req, res){
    res.render('index.ejs')
    //res.redirect('https://manager.linode.com/')
})
app.get('/music', function(req, res){
    res.render('music.ejs', musicBotData)
})

io.on('connection', () => {
    console.log("Connection!")
})

musicWebSocket.on('connection', socket => {
    socket.emit('handshake',musicBotData)
    socket.on('musicWebLink', token => {
        if (musicWebData.tokens[token]) {
            socket.emit('webLinkSuccess',musicWebData.tokens[token])
            return
        }
        socket.emit('botFail', "Invalid token")
    })
    socket.on('musicBotJoin', id => {
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicBotJoin', id)
    })
    socket.on('musicBotSkip', id => {
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicBotSkip', id)
    })
    socket.on('musicBotNuke', id => {
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicBotNuke', id)
    })
    socket.on('musicSongSearch', data => {
        if (data.search.length == 0) {socket.emit('botFail', 'Search cannot be empty');return}
        if (musicBotData.voiceChannel == 'no channel') {socket.emit('botFail', 'Bot is not in a voice channel');return}
        musicBotData.musicbotOnline != "online" ? socket.emit('botFail', 'Bot is offline') : musicBotSocket.emit('musicSongSearch', data)
    })
})
musicBotSocket.on('connection', socket => {
    socket.on('botLinkRequest', id => {
        if (Object.keys(musicWebData.tokens).find(key => musicWebData.tokens[key] === id)) {
            socket.emit('botLinkResponse', Object.keys(musicWebData.tokens).find(key => musicWebData.tokens[key] === id))
            return
        }
        let token = Math.random().toString(36).slice(2)
        if (token == musicWebData.tokens[token]) {
            while (token == musicWebData.tokens[token]) {
                token = Math.random().toString(36).slice(2)
            }
        }
        musicWebData.tokens[token] = id
        fs.writeFileSync(__dirname + '/musicWebData.json', JSON.stringify(musicWebData))
        socket.emit('botLinkResponse', token)
    })
    socket.on('botStateUpdate', state => {
        musicBotData.musicbotOnline = state
        musicWebSocket.emit('botStateUpdate', musicBotData.musicbotOnline)
        console.log("Bot online state: " + musicBotData.musicbotOnline)
    })
    socket.on('botChannelUpdate', name => {
        musicBotData.voiceChannel = name
        musicWebSocket.emit('botChannelUpdate', name)
    })
    socket.on('songCurrent', song => {
        musicBotData.songCurrent = song
        if (song.time) {
            if (songProgress) {
                clearInterval(songProgress);
            }
            songProgress = setInterval(function() {
                if (musicBotData.progress.time >= musicBotData.songCurrent.time) {
                    clearInterval(songProgress)
                    songProgress = null
                    musicBotData.progress.time = 0
                    musicBotData.progress.width = '0%'
                    musicWebSocket.emit('songProgress', musicBotData.progress)
                }
                musicBotData.progress.time = musicBotData.progress.time + 1000
                musicBotData.progress.width = `${musicBotData.progress.time / musicBotData.songCurrent.time * 100}%`
                musicWebSocket.emit('songProgress', musicBotData.progress)
            },1000)
        }
        musicWebSocket.emit('songCurrent', song)
    })
    socket.on('queueUpdate', queue => {
        musicBotData.queue = queue
        musicWebSocket.emit('queueUpdate', musicBotData.queue)
        if (queue.type = 'songAdd') {
            musicBotData.queue.queue[musicBotData.queue.queue.length-1].justAdded = false;
        }
    })
    socket.on('botFail', fail => {
        musicWebSocket.emit('botFail', fail)
    })
    socket.on('botInfo', info => {
        musicWebSocket.emit('botInfo', info)
    })
    socket.on('disconnect', () => {
        musicBotData.musicbotOnline = "offline"
        musicBotData.voiceChannel = 'no channel'
    })
})

http.listen(process.env.PORT || 8080, '0.0.0.0', function(){
    console.log('listening on purvaldur.dk')
})

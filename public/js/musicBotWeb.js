let socket = io('http://purvaldur.dk:8080/web')

let identity
let currentTime = 0

function milliTimeToMinutesSeconds(ms) {
    return new Date(ms - 1000).toISOString().slice(14, -5)
}

let vue = new Vue({
    el: '#musicApp',
    data: {
        state: null,
        channel: null,
        joinToggleText: 'JOIN',
        errorMessage: '{{ errorMessage }}',
        errorActive: false,
        queue: [],
        currentSong: {
            albumArt: null,
            time: null,
            timeFormatted: "00:00",
            timeCurrentFormatted: "00:00",
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
        progressBar: {
            width: "0%"
        },
        linkCheck: function() {
            if (readCookie("link")) {
                identity = readCookie("link")
                return true
            }
            return false
        }
    },
    methods: {
        nuke: function() {
            socket.emit('musicBotNuke')
        },
        joinToggle: function() {
            identity = readCookie("link")
            socket.emit('musicBotJoin', identity)
        },
        skip: function() {
            socket.emit('musicBotSkip')
        },
        songSearch: function() {
            socket.emit('musicSongSearch', {search: this.$refs.songField.value,id:identity})
            this.$refs.songField.value = ""
        },
        userLink: function() {
            socket.emit('musicWebLink', this.$refs.linkField.value)
            this.$refs.linkField.value = ""
        }
    }
})
socket.on('connect', () => {})

socket.on('handshake', handshakeData => {
    vue.state = handshakeData.musicbotOnline
    vue.channel = handshakeData.voiceChannel
    console.log(handshakeData)
    vue.currentSong = handshakeData.songCurrent
    if (handshakeData.songCurrent.time) {
        vue.currentSong.timeFormatted = milliTimeToMinutesSeconds(handshakeData.songCurrent.time)
    } else {
        vue.currentSong.timeFormatted = "00:00"
        vue.currentSong.timeCurrentFormatted = "00:00"
    }
    vue.queue = handshakeData.queue.queue
})
socket.on('botStateUpdate', stateUpdate => {
    vue.state = stateUpdate
    if (stateUpdate == 'offline') {
        vue.channel = 'no channel'
    }
})
socket.on('botChannelUpdate', channelUpdate => {
    vue.channel = channelUpdate
})
socket.on('songCurrent', song =>{
    vue.currentSong = song
    if (song.time) {
        vue.currentSong.timeFormatted = milliTimeToMinutesSeconds(song.time)
    }
})
socket.on('songProgress', progress => {
    if (progress.time == 1000) {
        vue.currentSong.timeCurrentFormatted == "00:00"
        vue.currentSong.timeFormatted == "00:00"
        return
    }
    vue.currentSong.timeCurrentFormatted = milliTimeToMinutesSeconds(progress.time)
    vue.progressBar.width = progress.width
})
socket.on('queueUpdate', queue => {
    console.log(queue);
    if (queue.type == "songEnd") {
        vue.queue.shift()
        return
    } else if (queue.type == "songAdd") {
        let newSong = queue.queue.pop()
        vue.queue.push(newSong)
    }
})
socket.on('botFail', fail => {
    console.log(fail);
    vue.errorMessage = fail
    vue.errorActive = true
    setTimeout(() => {
        vue.errorActive = false
    }, 2500)
})


socket.on("webLinkSuccess", id => {
    createCookie("link",id,3650)
    identity = id
    vue.linkCheck = function() {
        return true
    }
})

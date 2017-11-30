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
        timeFormatted: "00:00",
        timeCurrentFormatted: "00:00",
        progressBar: {
            width: "0%"
        },
        queueItem: {
            marginBottom: "0px"
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
    if (handshakeData.songCurrent.time) {
        vue.timeFormatted = milliTimeToMinutesSeconds(handshakeData.songCurrent.time)
    } else {
        vue.timeFormatted = "00:00"
        vue.timeCurrentFormatted = "00:00"
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
    if (song.time) {
        vue.timeFormatted = milliTimeToMinutesSeconds(song.time)
    }
})
socket.on('songProgress', progress => {
    if (progress.time == 1000 || progress.time == 0) {
        vue.timeCurrentFormatted == "00:00"
        vue.timeFormatted == "00:00"
        return
    }
    vue.timeCurrentFormatted = milliTimeToMinutesSeconds(progress.time)
    vue.progressBar.width = progress.width
})
socket.on('queueUpdate', queue => {
    console.log(queue);
    if (queue.type == "songEnd") {
        vue.queue[0].justAdded = true;
        setTimeout(() => {
            vue.queue.splice(0,1)
        },1000)
        return
    } else if (queue.type == "songAdd") {
        let newSong = queue.queue.pop()
        vue.queue.push(newSong)
        setTimeout(() => {
            vue.queue[vue.queue.length-1].justAdded = false;
        },100)
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

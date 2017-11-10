let socket = io('http://purvaldur.dk:8080/web');

let vue = new Vue({
    el: '#musicApp',
    data: {
        state: null,
        channel: null,
        song: null,
        joinToggleText: 'JOIN',
        errorMessage: '{{ errorMessage }}',
        errorActive: false,
        infoMessage: '{{ infoMessage }}',
        infoActive: false
    },
    methods: {
        nuke: function() {
            socket.emit('musicBotNuke')
        },
        joinToggle: function() {
            socket.emit('musicBotJoin', '134335929346293760');
        },
        skip: function() {
            socket.emit('musicBotSkip')
        },
        test: function() {
            console.log("test");
        },
        songSearch: function() {
            socket.emit('musicSongSearch', this.$refs.songField.value)
            this.$refs.songField.value = "";
        }
    }
})

socket.on('connect', () => {});

socket.on('handshake', handshakeData => {
    vue.state = handshakeData.musicbotOnline;
    vue.channel = handshakeData.voiceChannel;
    vue.song = handshakeData.songCurrent;
})
socket.on('botStateUpdate', stateUpdate => {
    vue.state = stateUpdate
    if (stateUpdate == 'offline') {
        vue.channel = 'no channel';
    }
})
socket.on('botChannelUpdate', channelUpdate => {
    vue.channel = channelUpdate;
})
socket.on('songCurrent', song =>{
    vue.song = song;
})
socket.on('botFail', fail => {
    vue.errorMessage = fail;
    vue.errorActive = true;
    setTimeout(() => {
        vue.errorActive = false;
    }, 2500)
})
socket.on('botInfo', info => {
    vue.infoMessage = info;
    vue.infoActive = true;
    setTimeout(() => {
        vue.infoActive = false;
    }, 3000)
})

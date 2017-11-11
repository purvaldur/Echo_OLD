let socket = io('http://purvaldur.dk:8080/web');

let identity;

let vue = new Vue({
    el: '#musicApp',
    data: {
        state: null,
        channel: null,
        song: null,
        joinToggleText: 'JOIN',
        errorMessage: '{{ errorMessage }}',
        errorActive: false,
        linkCheck: function() {
            if (readCookie("link")) {
                identity = readCookie("link");
                return true;
            }
            return false;
        }
    },
    methods: {
        nuke: function() {
            socket.emit('musicBotNuke')
        },
        joinToggle: function() {
            identity = readCookie("link");
            socket.emit('musicBotJoin', identity);
        },
        skip: function() {
            socket.emit('musicBotSkip');
        },
        songSearch: function() {
            socket.emit('musicSongSearch', this.$refs.songField.value);
            this.$refs.songField.value = "";
        },
        userLink: function() {
            socket.emit('musicWebLink', this.$refs.linkField.value);
            this.$refs.linkField.value = "";
        }
    }
});
socket.on('connect', () => {});

socket.on('handshake', handshakeData => {
    vue.state = handshakeData.musicbotOnline;
    vue.channel = handshakeData.voiceChannel;
    vue.song = handshakeData.songCurrent;
})
socket.on('botStateUpdate', stateUpdate => {
    vue.state = stateUpdate;
    if (stateUpdate == 'offline') {
        vue.channel = 'no channel';
    }
});
socket.on('botChannelUpdate', channelUpdate => {
    vue.channel = channelUpdate;
});
socket.on('songCurrent', song =>{
    vue.song = song;
});
socket.on('botFail', fail => {
    vue.errorMessage = fail;
    vue.errorActive = true;
    setTimeout(() => {
        vue.errorActive = false;
    }, 2500);
});

socket.on("webLinkSuccess", id => {
    createCookie("link",id,3650);
    vue.linkCheck = function() {
        return true;
    };
});

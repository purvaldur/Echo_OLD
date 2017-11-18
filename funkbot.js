// REQUIRES
const Discord = require('discord.js')
const io = require('socket.io-client')
const PlayMusic = require('playmusic')
const fs = require('fs')

//INITIALIZERs
const bot = new Discord.Client()
const pm = new PlayMusic()
const socket = io.connect('http://localhost:8080/musicBot')

//SETUP - OTHER
const tokens = JSON.parse(fs.readFileSync(__dirname + '/tokens.json', 'utf8'))
let monsterMash
let queue = []
let dispatcher = null
let linker

socket.on('connect', () => {
    socket.emit('botStateUpdate', "online")
    setTimeout(function() {
        monsterMash.members.get('378104449820000256').voiceChannel != undefined ? socket.emit('botChannelUpdate', monsterMash.members.get('378104449820000256').voiceChannel.name) : socket.emit('botChannelUpdate', 'no channel')
    },2000)
})

function songPlay(queue) {
    pm.getStreamUrl(queue[0].nid, (err,streamUrl) => {
        dispatcher = bot.voiceConnections.first().playStream(streamUrl, {seek:0, volume:0.15})
        socket.emit('songCurrent', queue[0])
        bot.ws.send({
            op: 3,
            d: { status: 'online', since: Date.now(), game: { name: `${queue[0].meta.artist} - ${queue[0].meta.title}`, type: 2 }, afk: false },
        })
        dispatcher.on('end', () => {
            queue.shift()
            socket.emit('queueUpdate', {queue: queue, type: "songEnd"})
            if (queue.length != 0) {
                songPlay(queue)
            } else {
                socket.emit('songCurrent', {albumArt:null,time:null,meta:{title:null,artist:null,album:null},selector:{avatar:null,name:null}})
                bot.ws.send({
                    op: 3,
                    d: { status: 'online', since: Date.now(), game: { name: `${tokens.musicWebsite}/music`, type: 2 }, afk: false },
                })
                dispatcher = null
            }
        })
    })
}
function songSearch(song, id) {
    pm.init({androidId: tokens.androidId, masterToken: tokens.androidMasterToken}, err => {
        if (err) console.log(err)
        pm.search(song, 5, (err, res) => {
            if (err) console.log(err)
            if (res.entries == undefined || res.entries.filter(data => { return data.type == 1 }).shift() == undefined) {
                socket.emit('botFail', 'Couldn\'t find song')
                return
            }
            let song = res.entries.filter(data => { return data.type == 1 }).shift()
            let selector = monsterMash.members.get(id)
            queue.push({
                albumArt: song.track.albumArtRef[0].url,
                time: song.track.durationMillis,
                meta: {
                    title: song.track.title,
                    artist: song.track.artist,
                    album: song.track.album
                },
                selector: {
                    avatar: `https://cdn.discordapp.com/avatars/${selector.user.id}/${selector.user.avatar}.png`,
                    name: `${selector.user.username}#${selector.user.discriminator}`
                },
                nid: song.track.storeId
            })
            socket.emit('queueUpdate', {queue:queue, type:"songAdd"})
            if (queue.length > 1) {
                return
            }
            songPlay(queue)
        })
    })
}

bot.on('ready', () => {
    bot.ws.send({
        op: 3,
        d: { status: 'online', since: Date.now(), game: { name: `${tokens.musicWebsite}/music`, type: 2 }, afk: false },
    })
    monsterMash = bot.guilds.get('93733172440739840')
    console.log('Echo: ONLINE')
})
bot.on('voiceStateUpdate', (oldMember, newMember) => {
    if (oldMember.voiceChannel == undefined) {
        return
    }
    if (oldMember.voiceChannel.connection && oldMember.voiceChannel.id == oldMember.voiceChannel.connection.channel.id && oldMember.voiceChannel.connection.channel.members.size == 1) {
        setTimeout(() => {
            if (oldMember.voiceChannel.connection && oldMember.voiceChannel.id == oldMember.voiceChannel.connection.channel.id && oldMember.voiceChannel.connection.channel.members.size == 1) {
                oldMember.voiceChannel.connection.channel.leave()
                socket.emit('botChannelUpdate', 'no channel')
            }
        },5000)
    }
})
bot.on('message', message => {
    if (message.content == "!link") {
        socket.emit('botLinkRequest', message.author.id)
        linker = message.author
    }
})

bot.login(tokens.botToken)

socket.on('botLinkResponse', token => {
    linker.send(`Your token is:\n**${token}**\n\nHere's the link to my web panel: ${tokens.musicWebsite} \nPaste the token into the "link" field if it prompts you, press enter, and then you're good to go!`)
    linker = null
})
socket.on('musicSongSearch', data => {
    songSearch(data.search, data.id)
})
socket.on('musicBotJoin', id => {
    let memberTarget = monsterMash.members.get(id)
    if (memberTarget.voiceChannel != undefined) {
        memberTarget.voiceChannel.join()
        socket.emit('botChannelUpdate', memberTarget.voiceChannel.name)
    } else {
        socket.emit('botFail', 'Target is not in a voice channel')
    }
})
socket.on('musicBotSkip', () => {
    if (dispatcher != null && queue.length != 0) {
        dispatcher.end()
    }
})
socket.on('musicBotNuke', () =>{
    if (dispatcher != null && queue.length != 0) {
        queue = []
        dispatcher.end()
    }
})

// catch ctrl+c event and exit normally
process.on('SIGINT', () => {
    socket.emit('botStateUpdate', "offline")
    bot.destroy()
    process.exit(2)
})

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', e => {
    socket.emit('botStateUpdate', "offline")
    bot.destroy()
    console.log('UNCAUGHT EXCEPTION:\n')
    console.log(e.stack)
    process.exit(99)
})

// REQUIRES
const Discord = require('discord.js');
const io = require('socket.io-client');
const PlayMusic = require('playmusic');
const fs = require('fs');

//INITIALIZERs
const bot = new Discord.Client();
const socket = io.connect('http://localhost:8080/musicBot');

//SETUP - OTHER
const tokens = JSON.parse(fs.readFileSync(__dirname + '/tokens.json', 'utf8'));
let monsterMash;
let queue = [];
let dispatcher = null;

socket.on('connect', () => {
    console.log("connected");
});

function songPlay(queue) {
    pm.getStreamUrl(queue[0].nid, (err,streamUrl) => {
        dispatcher = bot.voiceConnections.first().playStream(streamUrl, {seek:0, volume:0.15})
        socket.emit('songCurrent', `${queue[0].artist} - ${queue[0].song}`);
        bot.user.setGame(`${queue[0].artist} - ${queue[0].song}`);
        dispatcher.on('end', () => {
            queue.shift();
            if (queue != 0) {
                songPlay(queue);
            } else {
                socket.emit('botInfo', 'Reached end of queue');
                socket.emit('songCurrent', 'nothing');
                dispatcher = null;
            }
        })
    })
}
function songSearch(song) {
    pm.init({androidId: tokens.androidId, masterToken: tokens.androidMasterToken}, err => {
        if (err) console.log(err);
        console.log(song);
        pm.search(song, 5, (err, res) => {
            if (err) console.log(err);
            if (res.entries == undefined || res.entries.filter(data => { return data.type == 1 }).shift() == undefined) {
                socket.emit('botFail', 'Couldn\'t find song');
                return;
            }
            let song = res.entries.filter(data => { return data.type == 1 }).shift();
            queue.push({
                song: song.track.title,
                artist: song.track.artist,
                nid: song.track.storeId
            });
            socket.emit('botInfo', `{{ user }} put ${song.track.artist} - ${song.track.title} in queue`);
            if (queue.length > 1) {
                return;
            }
            songPlay(queue);
        })
    })
}

bot.on('ready', () => {
    monsterMash = bot.guilds.get('93733172440739840');
    socket.emit('botStateUpdate', "online");
    socket.emit('botInfo', "Echo is now online!");
    monsterMash.members.get('378104449820000256').voiceChannel != undefined ? socket.emit('botChannelUpdate', monsterMash.members.get('378104449820000256').voiceChannel.name) : socket.emit('botChannelUpdate', 'no channel');
    console.log('Echo: ONLINE');
})
bot.on('voiceStateUpdate', (oldMember, newMember) => {
    if (oldMember.voiceChannel == undefined) {
        console.log(newMember.voiceChannel.members.size);
        return;
    }
    if (oldMember.voiceChannel.connection && oldMember.voiceChannel.id == oldMember.voiceChannel.connection.channel.id && oldMember.voiceChannel.connection.channel.members.size == 1) {
        setTimeout(() => {
            if (oldMember.voiceChannel.connection && oldMember.voiceChannel.id == oldMember.voiceChannel.connection.channel.id && oldMember.voiceChannel.connection.channel.members.size == 1) {
                oldMember.voiceChannel.connection.channel.leave();
                socket.emit('botChannelUpdate', 'no channel');
            }
        },5000);
    }
});

bot.login(tokens.botToken);

socket.on('musicSongSearch', song => {
    songSearch(song);
});
socket.on('musicBotJoin', id => {
    let memberTarget = monsterMash.members.get(id);
    if (memberTarget.voiceChannel != undefined) {
        memberTarget.voiceChannel.join();
        socket.emit('botInfo', `Joining ${memberTarget.voiceChannel.name}`);
        socket.emit('botChannelUpdate', memberTarget.voiceChannel.name);
    } else {
        socket.emit('botFail', 'Target is not in a voice channel');
    }
});
socket.on('musicBotSkip', () => {
    if (dispatcher != null && queue.length != 0) {
        socket.emit('botInfo', `{{ user }} pressed SKIP`);
        dispatcher.end();
    }
});
socket.on('musicBotNuke', () =>{
    if (dispatcher != null && queue.length != 0) {
        queue = [];
        socket.emit('botInfo', `{{ user }} pressed NUKE`);
        dispatcher.end();
    }
});

// catch ctrl+c event and exit normally
process.on('SIGINT', () => {
    socket.emit('botStateUpdate', "offline");
    bot.destroy();
    process.exit(2);
});

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', e => {
    socket.emit('botStateUpdate', "offline");
    bot.destroy();
    console.log('UNCAUGHT EXCEPTION:\n');
    console.log(e.stack);
    process.exit(99);
});

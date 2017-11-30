const youtubedl = require('youtube-dl');

youtubedl.getInfo('https://www.youtube.com/watch?v=kd7KC3PaEaA',[],{maxBuffer:1000*1024}, function(err,info) {
    console.log(`Uploader: ${info.uploader}`);
    console.log(`Title: ${info.title}`);
    console.log(`Thumb: ${info.thumbnail}`);
    console.log(`URL: ${info.url}`);
})

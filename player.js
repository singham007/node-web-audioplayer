
var lame = require('lame'),
	Speaker = require('speaker'),
	fs = require('fs'),
	readline = require('readline'),
	readChunk = require('read-chunk'), 
	fileType = require('file-type'),
	colors = require('colors'),
	path  = require('path'),
	cp = require('child_process'),
	express  = require('express'),
    app      = express(),     
	config=require('./config.json');

console.log(config);
	//audioOptions = {channels: 2, bitDepth: 16, sampleRate: 44100};

var decoder, speaker,inputStream,playNext=true, songsDir = config.MusicDirectory,songs=[],dispSongs = [] ,currentVol = 100/*Playlist*/;

/*
var mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
    console.log( songsDir.red + ' folder created. Add Songs to the folder'.red);
    process.exit(0);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}

mkdirSync('.'+songsDir);
*/




try{
var files = fs.readdirSync(songsDir); // Read all files
}catch(e){
	if(e.code == 'ENOENT'){
		console.log('ERR:'.red + songsDir.red + ' doesnt exist! Plz Enter correct path to MusicDirectory in config.json'.red);
		process.exit(1);
	}
}

console.log('\n Searching Song in '.green  + songsDir.yellow + ' folder... \n'.green);

for(var j=0,len= files.length;j<len;j++){

	files[j] = songsDir+files[j];
	var validateIfMp3 = isMp3(files[j]);
    //console.log(files[j] + " isMp3 ? : " + validateIfMp3);
    if(validateIfMp3) songs.push(files[j]); // Push if file is MP3
}

function isMp3(mp3Src) { //Validate mp3 file
	var buffer = readChunk.sync(mp3Src, 0, 262);
	try {
		return fileType(buffer).ext === 'mp3';
	}catch(e){
		return false;
	}
}

console.log(' ' + songs.length.toString().yellow + ' Songs Found : \n'.green);


	for(var k=0;k<songs.length;k++){		
		dispSongs[k] = songs[k].replace(songsDir,'').replace('.mp3','');
		}

displayPlaylist();


function displayPlaylist(){

	var j=1;
	dispSongs.forEach(function(song){
		console.log( j.toString().red + ' : ' + song.yellow );
		j++;
	});
}

var currentSong =0 ;
function playSong(currentSong) { // Play song of index currentSong from songs[]

	if(currentSong > songs.length-1 || currentSong < 0){
		console.log('Please Enter valid Song Number'.red);
		return;
	}
	speaker     = new Speaker();
	decoder = lame.Decoder();
	inputStream = fs.createReadStream(songs[currentSong]);  // Read the first file
  	var a = inputStream.pipe(decoder).pipe(speaker); // Pipe the read data into the decoder and then out to the speakers
  	
  	speaker.once('flush', function(){
    // Play next song, if there is one,else StartOver
    	if (currentSong < songs.length - 1){
    		currentSong= currentSong+1;
      		if(playNext) playSong(currentSong);
    		}else{
    			currentSong=0;
    			playSong(currentSong);
    		}
  	});

  

}


///////// Command Line options////////

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){

/*
if(line == 'start') { 
	if(inputStream) {
		decoder.unpipe(speaker).once('unpipe',function(){speaker=null;playSong(0);});
		inputStream.unpipe(decoder);
	}else{
	speaker=null;
	playSong(0);
	}
}*/
if(line == 'stop') stop();

else if(line == 'resume') resume();

else if(line == 'pause') pause();

else if(line.indexOf('play')>-1) play(line);

else if(line.indexOf('setVolume')>-1) {
	line = line.replace('setVolume','');
	try{
		setVolume(parseInt(line));
	}catch(e){

	}
}

else if(line == 'next') next();

else if(line == 'stopApp') stopApp();

else if(line == 'list') {
	displayPlaylist();
}
else console.log('ERR : Wrong command...'.red + '\nCommands: play [songNumber] , pause ,resume , next , stopApp , stop, setVolume [percent] '.blue);

});

//*******************************//

function stop(){
	decoder.unpipe(speaker);
	inputStream.unpipe(decoder);  
	speaker=null ;
}

function pause(){
	pause = true ;
	decoder.unpipe(speaker);
}

function resume(){
	if(pause){
	decoder.pipe(speaker);
	pause=false;
	}
}

function play(line){
	line = line.replace('play','');
	playNext=false; 
	if(speaker) speaker.end(); 
	if(line) {
		try {
			playSong(parseInt(line) - 1 ); 
			currentSong =parseInt(line) - 1 ;
		}catch(e){
			console.log('ERR : play argument should be INT'.red);
			playSong(currentSong);
		} 
	}else playSong(0);
	setTimeout(function(){playNext=true},3000);
}

function next(){
	currentSong = currentSong+1;
	playNext=true ; 
	speaker.end();
}

function stopApp(){
	decoder.unpipe(speaker);
	inputStream.unpipe(decoder); 
	process.exit(0);
}

function setVolume(volume){
var args = ['-D', 'pulse', 'sset','Master',volume+'%'],
childProc = cp.spawn('amixer', args);
setVolumerl = readline.createInterface({
            input: childProc.stdout,
            output:childProc.stdin
        });
}

/////////////// Express ////////////


 app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
  

    app.listen(8080);
    console.log("App listening on port 8080");


    app.get('/play/:song_no', function(req, res) {
    	playNext=false; 
	if(speaker) speaker.end(); 

		try {
			 
			currentSong = req.params.song_no - 1 ;
			playSong( currentSong);

		}catch(e){
			console.log('ERR'.red);
			playSong(currentSong);
		} 

		res.send(JSON.stringify({'song':currentSong , 'action':'play'}));
    	
    });

    
     
    app.get('/pause', function(req, res) { 	
     	pause();   
     	res.send(JSON.stringify({'song':currentSong , 'action':'pause'}));
    });

    app.get('/next', function(req, res) {
     	next();      
     	res.send(JSON.stringify({'song':currentSong , 'action':'next'}));
    });

    app.get('/stop', function(req, res) {
     	stop();      
     	res.send(JSON.stringify({'song':currentSong , 'action':'stop'}));
    });

    app.get('/setvolume/:vol', function(req, res) {
     	  setVolume(req.params.vol);  
     	   res.send(JSON.stringify({'song':currentSong , 'action':'setvolume'}));
     	   currentVol = req.params.vol;
    });


    app.get('/playlist', function(req, res) {
    	
     	res.send(JSON.stringify(dispSongs));  
    });

    app.get('/getcurrentsong', function(req, res) {
    	
     	res.send(JSON.stringify({'song':currentSong , 'action':'null'}));  
    });


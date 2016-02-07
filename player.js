
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

	//audioOptions = {channels: 2, bitDepth: 16, sampleRate: 44100};

var decoder, 
speaker,inputStream,
playNext=true, 
songsDir = process.env.HOME + '/Music',
songs=[] ,
currentVol = 100;

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




function getMp3SubFolders(srcpath){

fs.readdirSync(srcpath).forEach(function(file){
	if(fs.statSync(path.join(srcpath, file)).isDirectory())
		getMp3SubFolders(path.join(srcpath,file));
	else if(isMp3(path.join(srcpath,file))) songs.push(path.join(srcpath,file));
});

/*
songs = songs.concat(glob.sync(srcpath + "/*.mp3" ).filter(
	function(file){
    	return isMp3(file);
	}));

fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  }).forEach(function(_dir){
	getMp3SubFolders(path.join(srcpath,_dir));
});
*/

}



/*
function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}

function getMp3Files(srcpath) {
  return glob.sync(srcpath + "*.mp3" ).filter(function(file) {
    return isMp3(file);
  });
}
*/

function isMp3(mp3Src) { //Validate mp3 file

	if(mp3Src.indexOf('.mp3') < 0) return false;

	try {
		return fileType(readChunk.sync(mp3Src, 0, 262)).ext === 'mp3';
	}catch(e){
		return false;
	}
}

try{
	
getMp3SubFolders(songsDir);
//songs = getMp3Files(songsDir); // Read all files
}catch(e){
	if(e.code == 'ENOENT'){
		console.log('ERR:'.red + songsDir.red + ' doesnt exist! Plz Enter correct path to MusicDirectory in config.json'.red);
		process.exit(1);
	}
}

console.log('\n Searching Song in '.green  + songsDir.yellow + ' folder... \n'.green);


console.log(' ' + songs.length.toString().yellow + ' Songs Found : \n'.green);
		

displayPlaylist();


function displayPlaylist(){

	songs.forEach(function(song,j){
		console.log( (j + 1).toString().red + ' : ' + song.replace(songsDir,'').replace('.mp3','').yellow );
	});
}

var currentSong =0 ;

function playSong(currentSong) { // Play song of index currentSong from songs[]

	if(currentSong > songs.length-1 || currentSong < 0){
		console.log('Please Enter valid Song Number'.red);
		return;
	}

	decoder = lame.Decoder();
	inputStream = fs.createReadStream(songs[currentSong]);  // Read the first file
	
	setTimeout(function(){
  		inputStream.pipe(decoder).on( 'format',function(format){
  			speaker     = new Speaker(format);
  			this.pipe(speaker);
  		});
	},500);


  	inputStream.on('end',function(){
            // Play next song, if there is one,else StartOver
    	if (currentSong < songs.length - 1){
    		currentSong= currentSong+1;
			 playSong(currentSong);
    		}else{
    			currentSong=0;
    			playSong(currentSong);
    		}
    });

  	 // Pipe the read data into the decoder and then out to the speakers
  	


  

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
	inputStream.destroy();
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

	if(inputStream){
		inputStream.destroy();
		inputStream.once('close',function(){
		if(line){
			try {
				playSong(parseInt(line) - 1 ); 
				currentSong =parseInt(line) - 1 ;
			}catch(e){
				console.log('ERR : play argument should be INT'.red);
				playSong(currentSong);
				} 
			}else playSong(0);

		});
	}else{
		if(line){
			try {
				playSong(parseInt(line) - 1 ); 
				currentSong =parseInt(line) - 1 ;
			}catch(e){
				console.log('ERR : play argument should be INT'.red);
				playSong(currentSong);
				} 
			}else playSong(0);
	}

}

function next(){
	currentSong = currentSong+1;
	speaker.end();
	if(inputStream)inputStream.destroy();
	inputStream.once('close',function(){
		playSong(currentSong);
	})
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


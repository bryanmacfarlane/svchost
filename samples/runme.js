var sh = require('../lib/svchost');

var host = new sh.SvcHost();
host.on('start', function(pid, starts){
	console.log('started (' + pid + ') - ' + starts + ' starts');
});

host.on('restart', function(){
	console.log('restart.  ');
});		

host.on('exit', function(code, reason){
	console.log('exit (' + code + ') : ' + reason);
});	

host.on('abort', function(){
	console.log('abort after restarts');
});		

//
// api consumer can control restarts, sleeps, grow etc...
// this example allows 5 starts with a wait of a second per restart in between
//
var maxStarts = 5;
var RESTART_DELAY = 1000;  // 1 sec

var handleRestart = function(starts, relaunch) {
	console.log(starts, 'starts');
	if (starts < maxStarts) {
		console.log('waiting to restart');
		setTimeout(function(){
				relaunch(true);
			}, 
			RESTART_DELAY*starts);			
	} 
	else {
		console.log('fail');
		relaunch(false);
	}
}

host.start('./badserver.js',           // app.  relative or absolute path
			[],                        // args 
			{outputPath: __dirname},   // optional.  defaults to apps directory
			handleRestart);  

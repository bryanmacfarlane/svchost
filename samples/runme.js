var sh = require('../lib/svchost');
var path = require('path');

var banner = function(str) {
	console.log('--------------------------------------------');
	console.log(str);
	console.log('--------------------------------------------');
}

var formatOutput = function(level, output) {
	return '[' + level + ']' + (new Date()).toTimeString() + ': ' + output;
}

var host = new sh.SvcHost();
host.on('start', function(pid, starts){
	banner('started (' + pid + ') - ' + starts + ' starts');
});

host.on('restart', function(){
	banner('restart.  ');
});		

host.on('exit', function(code, reason){
	banner('exit (' + code + ') : ' + reason);
});	

host.on('abort', function(){
	banner('abort after restarts');
});

host.on('stdout', function(data){
	process.stdout.write(formatOutput('out', data));
});

host.on('stderr', function(data){
	process.stdout.write(formatOutput('err', data));
});

//
// api consumer can control restarts, sleeps, grow etc...
// this example allows 5 starts with a wait of a second per restart in between
//
var maxStarts = 3;
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

host.start(path.join(__dirname, 'badserver.js'),           // absolute path (better for running as service)
			{ 
				// args:[], 
				// uid: 501,
				env: process.env, 
			},                       
			handleRestart);  

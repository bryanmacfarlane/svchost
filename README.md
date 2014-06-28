# SvcHost

SvcHost keeps a process alive with restarts


>  - Small and very lightweight
>  - Avoid dictating the restart logic.  Extensible logic for restart conditions, grow time, etc...
>  - Purpose built - avoid coupling with other problems like runnng as a service or file watching (see sister project [SvcInstall] for installing as a daemon)
>  - Package host with your app or service

## Install:

    npm install svchost --save


## Sample:
See /samples for more

```js
var sh = require('../lib/svchost');
var path = require('path');

var host = new sh.SvcHost();
host.on('start', function(pid, starts){
	console.log('started (' + pid + ') - ' + starts + ' starts');
});

host.on('restart', function(){
	console.log('restart.');
});		

host.on('exit', function(code, reason){
	console.log('exit (' + code + ') : ' + reason);
});	

host.on('abort', function(){
	console.log('abort after restarts');
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
			[],                        // args 
			handleRestart);  
```

License
----

Apache 2.0

[SvcInstall]:http://github.com/bryanmacfarlane/svcinstall


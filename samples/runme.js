var sh = require('../lib/svchost');

var host = new sh.SvcHost();
host.on('start', function(pid){
	console.log('started (' + pid + ')');
});

host.on('restart', function(starts){
	console.log('restart.  ' + starts + ' starts.');
});		

host.on('exit', function(code, reason){
	console.log('exit (' + code + ') : ' + reason);
});	

host.on('abort', function(){
	console.log('abort after restarts');
});		

host.start('./badserver.js',           // app.  relative or absolute path
			[],                        // args 
			{outputPath: __dirname});  // optional.  defaults to apps directory

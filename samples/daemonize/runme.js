var svchost = require('../../lib/svchost');

var child = svchost.daemonize('./runAndExit',   // app to run - relative or fully qualified
	           ['fail', 'another'],             // args
	           {outputPath: __dirname}); // optional, defaults to dir of app to run

if (child) {
	console.log('started in background on pid: ', child.pid);
}

child.on('uncaughtException', function(err) {
	console.err('Caught exception: ' + err);
});

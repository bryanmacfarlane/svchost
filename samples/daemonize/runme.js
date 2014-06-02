var appd = require('../../lib/svchost');

appd.daemonize('./runAndExit',       // app to run - relative or fully qualified
	           ['fail', 'another'],  // args
	           {logPath: './', logName:'hostIt'});

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

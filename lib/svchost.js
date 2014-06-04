var fs = require('fs')
  , spawn = require('child_process').spawn
  , os = require('os')
  , events = require('events')
  , path = require('path');

var RESTART_DELAY = 1000;  // 1 sec

var SvcHost = (function(){
	var SvcHost = function(){
		this.starts = 0;
		events.EventEmitter.call(this);
	}

	SvcHost.super_ = events.EventEmitter;
	SvcHost.prototype = Object.create(events.EventEmitter.prototype, {
	    constructor: {
	        value: SvcHost,
	        enumerable: false
	    }
	});	

    /*
     * appPath: fullPath to node js app file
     * args:    args to pass to app
     * options:
     *          detach: daemonize the child process
     *          maxRestarts: number of times to restart on failure. default 5
	 *          outputPath: path for captured out and err files
	 *                      defaults to appPath folder     
     */
    SvcHost.prototype.start = function(appPath, args, options, fn) {
    	// TODO: validate file path
    	this.appPath = appPath;
    	this.args = args;
    	//this.options = options || {};

    	this.dettach = options.dettach || false;
		this.outputPath = path.resolve(options.outputPath) || path.dirname(appPath);
	    this.maxRestarts = options.maxRestarts || 5;

		this._launch();    	
    }

    SvcHost.prototype._launch = function() {
    	this.child = _spawnApp(this.appPath, this.args, this.outputPath, path.basename(this.appPath, '.js'), this.detach);

    	if (this.child) {
    		this.pid = this.child.pid;
    		++this.starts;
    		this.emit('start', this.pid);
    		//this.FileLog('pid ' + this.pid + ', starts ' + this.starts);

	    	_this = this;
			this.child.on('exit', function(code){
			 	// _this.FileLog('exit (' + code + ') ' + typeof(code) + _this.appPath);
			 	var reason = 'unknown';

			 	if (code == 0 || code == 143) {  //143 is SIGTERM (ctrl-c, kill)
			 		reason = 'shutdown';
			 		// _this.FileLog('shutdown ' + _this.appPath);
			 	}
			 	else {
				 	if (_this.starts < _this.maxRestarts) {
				 		reason = 'failure';
				 		//_this.FileLog('relaunch');
				 		setTimeout(function(){
							_this._launch();
							_this.emit('restart', _this.starts);
				 		}, RESTART_DELAY);
				 	}
				 	else {
				 		reason = 'retries';
				 		_this.emit('abort');
				 	}
			 	}

			 	_this.emit('exit', code, reason);
			});       		
    	}
    	else {
    		//this.FileLog('Failed to spawn ' + this.appPath);
    	}    	 	
    }

	return SvcHost;
})();

exports.SvcHost = SvcHost;

/*
 * Create SvcHost hosting process, run your app inside of it, then daemonize it.
 *
 * appPath: fullPath to node js app file
 * args:    args to pass to app
 * options:
 *          outputPath: path for captured out and err files
 *                      defaults to appPath folder
 */
exports.daemonize = function(appPath, args, options) {
	appPath = path.resolve(appPath);
	var outputPath = options.outputPath ? path.resolve(options.outputPath) : path.dirname(appPath);

	// call self (SvcHost) directly via _spawnapp
	// that process will spawn the target app as a child process
	var spawnArgs = [appPath, outputPath];

	var svchostPath = path.resolve(__filename);
	
	var child = _spawnApp(svchostPath, spawnArgs.concat(args), outputPath, path.basename(appPath, '.js'), true);

	if (child) {
		child.unref();
	}

	return child;
}

/*
 * spawn app via node
 */
var _spawnApp = function(appPath, args, outputPath, fileName, detached) {
	//var fileName = path.basename(appPath, '.js');

	var outFile = path.join(outputPath, fileName + '.out')
	  , errFile = path.join(outputPath, fileName + '.err');

	 var out = fs.openSync(outFile, 'a')
       , err = fs.openSync(errFile, 'a');			

	 var child = spawn('node', [appPath].concat(args), {
	   detached: detached,
	   stdio: [ 'ignore', out, err ]
	 });	 

	 return child;
}

if (require.main === module) 
{ 
	var appPath = process.argv[2];
	var args = process.argv;
	args.shift();  // node
	args.shift();  // SvcHost.js
	var appPath = args.shift();
	var outputPath = args.shift();

	var logName = path.basename(appPath, '.js');
	var fd = fs.openSync(path.join(outputPath, logName + '.out'), 'a');

	var write = function(str) {
		fs.writeSync(fd, '[' + (new Date()).toString() + '] ' + str + os.EOL);	
	}

	if (appPath) {
		var host = new SvcHost();
		host.on('start', function(pid){
			write('started (' + pid + ') : ' + appPath);
		});

		host.on('restart', function(starts){
			write('restart.  ' + starts + ' starts.');
		});		

		host.on('exit', function(code, reason){
			write('exit (' + code + ') : ' + reason);
		});	

		host.on('abort', function(){
			write('abort after retries : ' + appPath);
		});		

		host.start(appPath, args, {outputPath: outputPath});		
	}
}

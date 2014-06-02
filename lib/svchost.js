var fs = require('fs')
  , spawn = require('child_process').spawn
  , os = require('os')
  , events = require('events')
  , logm = require('./filelog')
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
     *          logPath: defaults to folder of app
     *          friendlyName: defaults to parent folder name of app file
     *          logName: defaults to friendlyName.  creates .out and .err
     *          maxRestarts: number of times to restart on failure. default 5
     */
    SvcHost.prototype.start = function(appPath, args, options, fn) {
    	// TODO: validate file path
    	this.appPath = appPath;
    	this.args = args;
    	//this.options = options || {};

    	this.dettach = options.dettach || false;
		this.folder = path.dirname(this.appPath);
		this.logPath = options.logPath || this.folder;
		this.friendlyName = options.friendlyName || path.basename(this.folder);
	    this.logName = options.logName || this.friendlyName;
	    this.maxRestarts = options.maxRestarts || 5;

		this._launch();    	
    }

    SvcHost.prototype._launch = function() {
    	this.child = _spawnApp(this.appPath, this.args, this.logPath, this.logName, this.detach);

    	if (this.child) {
    		this.pid = this.child.pid;
    		++this.starts;
    		this.emit('start', this.pid);
    		//this.appdLog('pid ' + this.pid + ', starts ' + this.starts);

	    	_this = this;
			this.child.on('exit', function(code){
			 	// _this.appdLog('exit (' + code + ') ' + typeof(code) + _this.appPath);
			 	var reason = 'unknown';

			 	if (code == 0 || code == 143) {  //143 is SIGTERM (ctrl-c, kill)
			 		reason = 'shutdown';
			 		// _this.appdLog('shutdown ' + _this.appPath);
			 	}
			 	else {
				 	if (_this.starts < _this.maxRestarts) {
				 		reason = 'failure';
				 		//_this.appdLog('relaunch');
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
    		this.appdLog('Failed to spawn ' + this.appPath);
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
 *          logPath: defaults to folder of app
 *          friendlyName: defaults to parent folder name of app file
 *          logName: defaults to friendlyName.  creates .out and .err
 */
exports.daemonize = function(appPath, args, options) {
	appPath = path.resolve(appPath);
	var folder = path.dirname(appPath);
	var logPath = path.resolve(options.logPath) || folder;
	var friendlyName = options.friendlyName || path.basename(folder);
    var logName = options.logName || friendlyName;	

	// call self (SvcHost) directly via _spawnapp
	// that process will spawn the target app as a child process
	var logger = new logm.AppDLog();
	logger.open(logPath, logName);

	var spawnArgs = [appPath, logPath, logName];

	var appdPath = path.resolve(__filename);
	
	var child = _spawnApp(appdPath, spawnArgs.concat(args), logPath, logName, true);
	if (child) {
		logger.log('started (' + child.pid + ') : ' + appdPath);	
		child.unref();		
	}
	else {
		// TODO: err callback so caller can output
		logger.log('failed to start : ' + appdPath);	
	}
}

/*
 * spawn app via node
 */
var _spawnApp = function(appPath, args, logPath, logName, detached) {
	//appdLog('spawning ' + appPath);

	var outFile = path.join(logPath, logName + '.out')
	  , errFile = path.join(logPath, logName + '.err');

	 var out = fs.openSync(outFile, 'a')
       , err = fs.openSync(errFile, 'a');			

	 var child = spawn('node', [appPath].concat(args), {
	   detached: detached,
	   stdio: [ 'ignore', out, err ]
	 });

	 /*if (child) {
	 	appdLog('spawned (' + child.pid + ') ' + appPath);
	 }*/

	 return child;
}

if (require.main === module) 
{ 
	var appPath = process.argv[2];
	var args = process.argv;
	args.shift();  // node
	args.shift();  // SvcHost.js
	var appPath = args.shift();
	var logPath = args.shift();
	var logName = args.shift();
	if (appPath) {
		var logger = new logm.AppDLog();
		logger.open(logPath, logName);

		var host = new SvcHost();
		host.on('start', function(pid){
			logger.log('started (' + pid + ') : ' + appPath);
		});

		host.on('restart', function(starts){
			logger.log('restart.  ' + starts + ' starts.');
		});		

		host.on('exit', function(code, reason){
			logger.log('exit (' + code + ') : ' + reason);
		});	

		host.on('abort', function(){
			logger.log('abort after retries : ' + appPath);
		});		

		host.start(appPath, args, {logPath: logPath, logName: logName});		
	}
}

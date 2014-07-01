var fs = require('fs')
  , spawn = require('child_process').spawn
  , os = require('os')
  , events = require('events')
  , path = require('path');

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
     * options: 
     *     args: args to pass to app.  default to [].
     *     env: env vars.  defaults to process.env
     *     uid: optional.  uid to run child as.
     *     gid: optional.  gid to run child as.
	 * handleRestart(starts, launch): callback with custom logic on retries etc... 
     */
    SvcHost.prototype.start = function(appPath, options, handleRestart) {
    	// TODO: validate file path
    	this.appPath = appPath;
    	this.args = options.args || [];
    	this.env = options.env || process.env;
    	this.uid = options.uid || 0;
    	this.gid = options.gid || 0;
    	this.handleRestart = handleRestart;

		this._launch();    	
    }

    SvcHost.prototype._launch = function() {
    	this.child = this._spawnApp(this.appPath, this.args, this.env, this.uid);

    	if (this.child) {
    		this.pid = this.child.pid;
    		++this.starts;
    		this.emit('start', this.pid, this.starts);

	    	_this = this;
			this.child.on('exit', function(code){
			 	var reason = 'unknown';

			 	if (code == 0 || code == 143) {  //143 is SIGTERM (ctrl-c, kill)
			 		reason = 'shutdown';
			 	}
			 	else {
			 		_this.handleRestart(_this.starts, function(relaunch) {
						if (relaunch) {
				 			reason = 'failure';
				 			_this.emit('restart');
				 			_this._launch();
				 		}
				 		else {
					 		reason = 'retries';
					 		_this.emit('abort');
				 		}

				 		_this.emit('exit', code, reason);
			 		}); 
			 	}
			});       		
    	}	 	
    }

	SvcHost.prototype._spawnApp = function(appPath, args, env, uid, gid) {
		 var options = { env: env };
		 if (uid > 0) {
		 	options.uid = uid;
		 }

		 if (gid > 0) {
		 	options.gid = gid;
		 }

		 var child = spawn(process.execPath, [appPath].concat(args), options);

		 var _this = this;
		 child.stdout.setEncoding('utf8');
		 child.stdout.on('data', function(data){
			_this.emit('stdout', data);
		 });

		 child.stderr.setEncoding('utf8');	 
		 child.stderr.on('data', function(data){
			_this.emit('stderr', data);
		 });

		 return child;
	}    

	return SvcHost;
})();

exports.SvcHost = SvcHost;


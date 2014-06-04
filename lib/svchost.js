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
     * args:    args to pass to app
     * options:
     *          detach: daemonize the child process
     *          maxRestarts: number of times to restart on failure. default 5
	 *          outputPath: path for captured out and err files
	 *                      defaults to appPath folder     
	 *          bool handleRestart(starts, launch): callback with custom logic on retries etc... 
     */
    SvcHost.prototype.start = function(appPath, args, options, handleRestart) {
    	// TODO: validate file path
    	this.appPath = appPath;
    	this.args = args;
    	this.handleRestart = handleRestart;
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
    		this.emit('start', this.pid, this.starts);
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

			 		/*
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
				 	*/
			 	}

			 	
			});       		
    	}	 	
    }

	return SvcHost;
})();

exports.SvcHost = SvcHost;

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

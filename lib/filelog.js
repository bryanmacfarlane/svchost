var path = require('path')
  , df = require('dateformat')
  , os = require('os')
  , fs = require('fs');

// dirt simple file logger

// TODO - get from config
var FORMAT = "dddd, mmmm dS, yyyy, h:MM:ss TT";

var AppDLog = (function(){
	var AppDLog = function() {

	}

	AppDLog.prototype.open = function(logPath, logName) {
		// TODO: validate path exists.  make async - only logs startup, shutdown etc... so not a big deal
		this.fd = fs.openSync(path.join(logPath, logName + '.log'), 'a');
	} 

	AppDLog.prototype.log = function(str) {
		fs.writeSync(this.fd, '[' + df(new Date(), FORMAT) + '] ' + str + os.EOL);
	}

	return AppDLog;
})();

exports.AppDLog = AppDLog;
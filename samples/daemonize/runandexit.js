
var idx = 0;
var cmd = process.argv[2];

var doWork = function() {
	setTimeout(function(){
		console.log('work ' + ++idx);
		if (idx < 5)
			doWork();
		else {
			if (cmd === 'fail') {
				console.log('oops');
				throw new Error('Unhandled!');
			}
		}

	}, '1000');	
}

doWork();

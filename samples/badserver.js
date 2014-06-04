function randomCrash (res) {
    if (Math.floor(Math.random() * 3 % 3) == 0) {
    	throw new Error('Oops, our server crashed');
    }
}

var http = require('http');
http.createServer(function (req, res) {
  randomCrash(res);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');

process.on('uncaughtException', function(err) {
	console.error('Caught exception: ' + err);
	process.exit(1);
});
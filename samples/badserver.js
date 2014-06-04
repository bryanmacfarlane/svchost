var counter = 0;

var http = require('http');
http.createServer(function (req, res) {
  if (req.url === '/favicon.ico') {
    res.writeHead(200, {'Content-Type': 'image/x-icon'} );
    res.end();
    return;
  }

  // crash every other request
  counter++;
  if (counter % 2 == 0) {
  		throw new Error('Oops, our server crashed');
  }

  console.log('request processed');
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');

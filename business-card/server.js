/**
 * Local preview + PNG export for Supple Automotive business cards.
 * Run: node business-card/server.js
 * Port: PORT env (default 3001). If busy, tries the next ports up to +15.
 */
var path = require('path');
var http = require('http');
var express = require('express');
var app = express();
var dir = __dirname;
var publicDir = path.join(dir, 'public');
var repoPublic = path.join(dir, '..', 'public');

app.use('/logo', express.static(path.join(repoPublic, 'logo')));
app.use('/images', express.static(path.join(repoPublic, 'images')));
app.use(express.static(publicDir));

var basePort = Number(process.env.PORT) || 3001;
var maxAttempts = 16;

function listen(port, attempt) {
  if (attempt > maxAttempts) {
    console.error(
      'Could not bind a port (tried ' + basePort + '–' + (basePort + maxAttempts - 1) + '). Free one with: lsof -i :' + basePort
    );
    process.exit(1);
    return;
  }

  var server = http.createServer(app);

  server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      if (attempt === 0) {
        console.warn('Port ' + port + ' is already in use.');
      }
      listen(port + 1, attempt + 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });

  server.listen(port, function () {
    var url = 'http://localhost:' + port + '/';
    if (port !== basePort) {
      console.warn('Using port ' + port + ' instead of ' + basePort + '.');
    }
    console.log('Business card tool: ' + url);
  });
}

listen(basePort, 0);

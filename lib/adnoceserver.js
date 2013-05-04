var http = require('http'), https = require('https'), url = require('url'), fs = require('fs'),    
  db = require('mongoose'),
  connect = require('connect'),   
  express = require('express'),
  Log = require('log');
var routes = require('./adnoceserver-routes.js'),    
  adnoce = require('./adnoce');

var log = new Log('info');

// creates a new adnoce server based on expres
var app = express();
module.exports = function (options) {
  "use strict";

  this.routes = routes;

  var _name = 'adnoceserver';
  var config = {};

  config.server = {
    port: options.port || 8080,
    host: options.host || 'localhost',
    cookiesecret: options.cookiesecret || 'adnocebe1e2c9d20dd0b0a',
    dumpExceptions: options.dumpExceptions || true,
    showStack: options.showStack || true,
    adnoceport: options.adnoceport || 80,
    adnocehost: options.adnocehost || 'localhost',
    socketnamespace: options.socketnamespace || 'adnoce'
  };

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
  });

  app.use(connect.bodyParser())
  .use(connect.query())    
  .use(connect.cookieParser(config.server.cookiesecret))        
  .use(app.router)
  .use(express.errorHandler({ dumpExceptions: config.server.dumpExceptions, showStack: config.server.showStack }));

  // Routes
  // views
  app.get('/', routes.index);
  // API
  app.get('/api/:collection', routes.genericAPI);
  // external requests (in case, no CDN is defined)
  app.get('/jquery-1.9.1.min.js', function (req, res) {
    res.set('Content-Type', 'application/javascript');        
    fs.readFile(__dirname + '/external/jquery-1.9.1.min.js', 'utf8', function(err, data){            
      if (err === null) res.send(200, data);  
      else res.send(404);            
    });
  });

  // create the server
  var server = http.createServer(app);    
  server.listen(config.server.port, config.server.host, function(e,s) {    
    log.info('adnoce server - "%s" running on port %s', config.server.host, config.server.port);  
  });
  // setup websockets
  var io = require('socket.io').listen(server);
  io.configure(function (){
    io.set('log level', 1);
  });
  // setup websockets client (connect to adnoce core)
  var ioc = require('socket.io-client');
  var adnocesocket = ioc.connect(config.server.adnocehost+':'+config.server.adnoceport+'/'+config.server.socketnamespace, {reconnect: true});    
  // adnoce events
  adnocesocket.on('connect', function(){    
    if (adnocesocket.socket.connected) log.info('adnoce server - socket connection to adnoce core established, host: "%s:%s"', adnocesocket.socket.options.host, adnocesocket.socket.options.port);
  });
  adnocesocket.on('trackingdata', function(data){
    io.sockets.emit('trackingdata', data);    
  });
}
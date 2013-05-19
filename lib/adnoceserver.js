var http = require('http'), https = require('https'), url = require('url'), fs = require('fs'),    
  db = require('mongoose'),
  connect = require('connect'),   
  express = require('express'),
  ejs = require('ejs'),
  Log = require('log');
var routes = require('./adnoceserver-routes.js'),    
  adnoce = require('./adnoce');

var log = new Log('info');

// creates a new adnoce server based on expres
var app = express();
module.exports = function (options) {
  "use strict";

  var _name = 'adnoceserver';
  var config = {};

  config.server = {
    port: options.port || 8080,
    host: options.host || 'localhost',
    cdnurl: options.cdnurl || '', // see external requests routes below
    cookiesecret: options.cookiesecret || 'adnocebe1e2c9d20dd0b0a',
    dumpExceptions: options.dumpExceptions || true,
    showStack: options.showStack || true,
    adnoceport: options.adnoceport || 80,
    adnocehost: options.adnocehost || 'localhost',
    socketnamespace: options.socketnamespace || 'adnoce'
  };
  config.auth = {
    enabled: options.auth || false,
    user: options.user || 'admin',
    password: options.password || 'admin'
  };
  config.db = { // can be null, reusing existing connection from adnoce core
    host: options.databasehost || null, 
    name: options.databasename || null,
    port: options.databaseport || '27017',
    options: options.databaseoptions || {}
  }

  // Configure express
  routes.setCDNURL(config.server.cdnurl);

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
  });

  app.use(express.bodyParser())
  .use(express.query())    
  .use(express.compress())
  .use(express.cookieParser(config.server.cookiesecret))        
  .use(app.router)
  .use(express.errorHandler({ dumpExceptions: config.server.dumpExceptions, showStack: config.server.showStack }));
  // Auth
  var authCheck = express.basicAuth(function(user, pass) {
    return user === config.auth.user && pass === config.auth.password;
  });  
  // Routes middleware
  var routesMiddleware = [];
  // add auth if enabled via config
  if (config.auth.enabled === true) {
    routesMiddleware.push(authCheck);
  }
  // Routes
  // views  
  app.get('/', routesMiddleware, routes.index);  
  app.get('/retro', routesMiddleware, routes.index);  
  // MR API
  app.get('/api/:collection', routes.genericMRAPI);
  // DB API
  app.get('/api/db/:collection', routesMiddleware, routes.genericDBAPI);
  // own requests (js, css)
  app.get('/js/:jsfile', function (req, res) {    
    res.set('Content-Type', 'application/javascript');
    if (process.env.NODE_ENV  === 'development') res.setHeader('Cache-Control', 'no-cache,no-store');
    else res.setHeader('Cache-Control', 'max-age=172800,public');
    fs.readFile(__dirname + '/external/js/'+req.params.jsfile, 'utf8', function(err, data){            
      if (err === null) res.send(200, data);  
      else res.send(404);            
    });
  });
  // store css in memory
  var fileStore = {};  
  fs.readFile(__dirname + '/external/css/main.css', 'utf8', function(err, data){            
    if (err === null) fileStore['main.css'] = ejs.render(data, {cdnurl : config.server.cdnurl});
  });
  app.get('/css/:cssfile', function (req, res) {    
    res.set('Content-Type', 'text/css');
    if (process.env.NODE_ENV  === 'development') res.setHeader('Cache-Control', 'no-cache,no-store');
    else res.setHeader('Cache-Control', 'max-age=172800,public');
    if (fileStore[req.params.cssfile]) res.send(200, fileStore[req.params.cssfile]);
    else fs.readFile(__dirname + '/external/css/'+req.params.cssfile, 'utf8', function(err, data){          
      if (err === null) res.send(200, ejs.render(data, {cdnurl : config.server.cdnurl}));  
      else res.send(404);            
    });
  });
  // external requests (in case, no CDN is defined)
  app.get('/js/libs/:jsfile', function (req, res) {    
    res.set('Content-Type', 'application/javascript');        
    fs.readFile(__dirname + '/external/js/libs/'+req.params.jsfile, 'utf8', function(err, data){            
      if (err === null) res.send(200, data);  
      else res.send(404);            
    });
  });
  app.get('/fonts/:font', function (req, res) {
    var fonttype = req.params.font.toString().substring(req.params.font.toString().lastIndexOf('.')+1);
    
    if (fonttype === 'otf')  res.set('Content-Type', 'font/opentype');  
    else if (fonttype === 'woff')  res.set('Content-Type', 'application/x-font-woff');    
    else if (fonttype === 'svg')  res.set('Content-Type', 'image/svg+xml');    
    else res.set('Content-Type', 'application/octet-stream');    
    fs.readFile(__dirname + '/external/fonts/'+req.params.font, 'utf8', function(err, data){            
      if (err === null) res.send(200, data);  
      else res.send(404);            
    });
  });

  // create the server
  var server = http.createServer(app);    
  server.listen(config.server.port, config.server.host, function(e,s) {    
    log.info('adnoce server - "%s" running on port %s', config.server.host, config.server.port);  
  });
  // setup database connection
  if (config.db.host !== null) {
    db.connect('mongodb://'+config.db.host+':'+config.db.port+'/'+config.db.name, config.db.options, function(){  
      log.info('adnoce server - creating database connection to "%s" on host "%s:%s", status: %s', config.db.name, config.db.host, config.db.port, db.connection.readyState);  
      if (db.connection.readyState != 1) {
        log.error('adnoce server - database connection not ready yet');        
      }
    });
  }
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

  // expose some internals
  this.routes = routes;
  this.MapReduce = require('./mapreduce.js').MapReduce;
}
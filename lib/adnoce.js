var db = require('mongoose');
var Log = require('log'), log = new Log('info');

var clienttracking = require('./clienttracking.js');
var mapreduce = require('./mapreduce.js');

var io = null;

exports.server = require('./adnoceserver.js');

exports.setDatabase = function(databaseConfiguration) {
  db.connect('mongodb://'+databaseConfiguration.host+'/'+databaseConfiguration.name, function(){  
    log.info('adnoce core - creating database connection to "%s" on host "%s", status: %s', databaseConfiguration.name, databaseConfiguration.host, db.connection.readyState);  
    if (db.connection.readyState != 1) {
      log.error('database connection not ready');    
    }
  });
}
exports.setServerSocketIO = function(io_, path_) {
  var path = path_ || '/adnoce';
  io = io_.of(path);
  io.on('connection', socketConnection);   
  clienttracking.setSocketIO(io);
}

var socketConnection = function(socket_) {      
  log.info('adnoce core - server socket client "%s" connected to endpoint "%s"', socket_.id, socket_.flags.endpoint);  
}

exports.clientTrackingScript = function(req, res) {
  res.setHeader('Cache-Control', 'no-cache');
  res.writeHead(200, {'Content-Type': 'application/javascript'});
  res.end(clienttracking.getClientTrackingScript(req));
  var additionalData = null;
  if (req.session && req.session.user) {
    additionalData = {};
    additionalData.userType = 1;
  }
  clienttracking.processRequest(req, additionalData);
};
exports.clientTrackingScriptUpdate = function(req, res) {  
  res.setHeader('Cache-Control', 'no-cache');
  res.writeHead(200, {'Content-Type': 'text/plain'});
  if (!req.param('p')) res.end('0'); else {
    res.end('1');    
    clienttracking.updateSessionData(req.sessionID, req.param('p'));
  }
};

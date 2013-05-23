var db = require('mongoose');
var Log = require('log'), log = new Log('info');

var clienttracking = require('./clienttracking.js');
var mapreduce = require('./mapreduce.js');

var io = null;

exports.server = require('./adnoceserver.js');

exports.setDatabase = function(databaseConfiguration, callback) {
  var port = databaseConfiguration.port || '27017';
  var opts = databaseConfiguration.options || {};
  db.connect('mongodb://'+databaseConfiguration.host+':'+port+'/'+databaseConfiguration.name, opts, function(){  

    log.info('adnoce core - creating database connection to "%s" on host "%s:%s", status: %s', databaseConfiguration.name, databaseConfiguration.host, port, db.connection.readyState);  
    if (db.connection.readyState != 1) {
      log.error('adnoce core - database connection not ready yet');      
    }
    if (typeof(callback) === 'function') callback(db);
  });  
}
exports.setServerSocketIO = function(io_, path_) {
  var path = path_ || '/adnoce';
  io = io_.of(path).authorization(function (handshakeData, callback) {
    // @TODO: auth (e.g. ip-based on handshakeData.address)
    callback(null, true);
  }).on('connection', socketConnection);   
  clienttracking.setSocketIO(io);
}

var socketConnection = function(socket_) {    
  log.info('adnoce core - server socket client "%s" connected to endpoint "%s"', socket_.handshake.address.address, socket_.flags.endpoint);  
}

exports.clientTrackingScript = function(req, res) {
  res.set({'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache'});  
  res.send(200, clienttracking.getClientTrackingScript(req));  
  var additionalData = req.adnoceData || {};
  additionalData.adnocetype = 1;      
  clienttracking.processRequest(req, additionalData);
};
exports.clientTrackingScriptUpdate = function(req, res) {  
  res.set({'Content-Type': 'text/plain', 'Cache-Control': 'no-cache'});  
  if (!req.param('p')) res.send(400, '0'); else {
    res.send(200, '1');    
    var additionalData = req.adnoceData || {};        
    if (req.param('t')) additionalData.adnocetype = req.param('t');
      clienttracking.updateSessionData(req.sessionID, req.param('p'), additionalData);
  }
};
exports.addEvent = function(type, name, sessionId, additionalData) {    
  clienttracking.addEvent(type, name, sessionId, additionalData);
};
exports.MapReduce = mapreduce.MapReduce;

var pushServerHealth = function(serverOSObject) {
  io.emit('health', {uptime: serverOSObject.uptime(), load: serverOSObject.loadavg(), memory: {total: serverOSObject.totalmem(), free: serverOSObject.freemem()}});
}
exports.pushServerHealth = pushServerHealth;
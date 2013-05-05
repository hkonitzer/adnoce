var db = require('mongoose');
var models = require('./databasemodels.js');
var Log = require('log'), log = new Log('info');
var io = null;

/**
* Sets the socket to transport messages to adnoce server 
* @param socket.io socket
*/
exports.setSocketIO = function(io_) {
  if (io === null) io = io_;  
}

var getClientTrackingScript = function(request) {
  // Tracking Script client side to retrieve persistentSessionID (needs jQuery)
  if (request.sessionID) return 'if (localStorage) if(localStorage.getItem("adnoce.di") === null) { localStorage.setItem("adnoce.di","'+request.sessionID+'"); } else { $.get("/adnoce/s", { p : localStorage.getItem("adnoce.di"), t : 101 }); }';  
  else return '';
};
exports.getClientTrackingScript = getClientTrackingScript;

/**
* Gets an request and creates an visit/view entry for it
* provide additionalData to store additional fields defined in adnoce-visit schema
* @param request
* @param addtionalData (optional)
* @return false if no sessionID or url (referer) was provided, true otherwise
*/
var processRequest = function(request, additionalData) {  
  return pushTrackingData(request.sessionID, request.headers, additionalData);
}
exports.processRequest = processRequest;

/**
* Removes parameters from url
* @param url
*/
var normalizeURL = function(url) {
  if (typeof(url) !== 'string') return null;
  var markpos = url.indexOf('?');
  if (markpos > -1) url = url.substring(0, markpos);
  var beitretenpos = url.indexOf('beitreten');
  if (beitretenpos > -1) url = url.substring(0,url.lastIndexOf('/'));
  return url;
}

/**
* Tracking Function: updates a view/visit from requestheaders
* @param sessionID
* @param requestHeaders
* @param additionaldData - additional data to store into adnoce-session (see schema), transfered to updateSessionData
* @return false if no sessionID or url (referer) was provided, true otherwise
*/
var pushTrackingData = function(sessionID, requestHeaders, additionalData) {  
  var url = requestHeaders.referer;
  if (!sessionID || !url) return false;
  if (additionalData && additionalData !== null && typeof(additionalData) === 'object') {   
    additionalData.userAgent = requestHeaders['user-agent'];    
  } else {
    additionalData = {userAgent : requestHeaders['user-agent'], adnocetype : 100}    
  } 
  var newTrackingData = new models.AdnoceVisit();
  newTrackingData.url = normalizeURL(url);
  newTrackingData.sessionId = sessionID;
  newTrackingData.save(function(err) {
    if (err) log.error(err);
    else {
      updateSessionData(sessionID, null, additionalData, function(error, updata){
        if (io && updata) {          
          if (!updata.adnocetype) updata.adnocetype = parseInt(additionalData.adnocetype, 10);          
          io.emit('trackingdata', mergeJSObjects(updata, newTrackingData.toJSON()));  
        }
      });
      
    }
  });
  return true;
}
exports.pushTrackingData = pushTrackingData;
/**
* Tracking Function: updates additional session data for a view
* @param sessionID
* @param persistentSessionID (optional)
* @param additionaldData - additional data to store into adnoce-session (see schema)
* @return false if no sessionID was provided, true otherwise
*/
var updateSessionData = function(sessionID, persistentSessionID, additionalData, callback) {
  if (!sessionID) return false; 
  var updateObject = null;
  if (typeof(additionalData) === 'object') updateObject = additionalData; else updateObject = {};
  updateObject.timestamp = Date.now();  
  if (persistentSessionID) updateObject.persistentSessionId = persistentSessionID;    
  models.AdnoceSession.findOneAndUpdate({ sessionId: sessionID }, updateObject, { upsert: true }, function(err, doc) {
    if (err) log.error(err);    
    else {
      var answer = doc.toJSON();
      answer.adnocetype = additionalData.adnocetype;
      if (typeof(callback) === 'function') if (doc) callback(err, answer); else callback(err, null);
    } 
  });
  return true;
}
exports.updateSessionData = updateSessionData;

/**
* Merges two js objects (beware: no collision check)
* @param 1..n objects
* @return the merged object
*/
var mergeJSObjects = function() {
  var newObject = {};
  if (arguments.length == 0) return newObject;  
  for (var a = 0, argLength = arguments.length; a < argLength; a++) {
    for (var o in arguments[a]) {
      if (typeof arguments[a] == 'object' && !newObject[o]) {
        newObject[o] = arguments[a][o];       
      }
    }
  } 
  return newObject;
}
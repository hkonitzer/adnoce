var db = require('mongoose');
var models = require('./databasemodels.js');
var Log = require('log'), log = new Log('info');
var io = null;

/**
* Sets the socket to transport messages to adnoce server 
* @param socket.io socket
*/
var setSocketIO = function(io_) {
  if (io === null) io = io_;  
}
exports.setSocketIO = setSocketIO;

/**
* Delivers the javascript snippet for clients. The script initaties a AJAX call with the current session id (prefilled in script)
* @param the request
* @return javscript as string with session id included
*/
var getClientTrackingScript = function(request) {
  // Tracking Script client side to retrieve persistentSessionID (needs jQuery)
  if (request.sessionID) return 'if (localStorage) if(localStorage.getItem("adnoce.di") === null) { localStorage.setItem("adnoce.di","'+request.sessionID+'"); } else { $.get("/adnoce/s", { p : localStorage.getItem("adnoce.di"), t : 101, up : location.search }); }';  
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
  var ret = {host: null, params: []};
  var markpos = url.indexOf('?');
  if (markpos > -1) {
    ret.host = url.substring(0, markpos);  
    var urlParams = url.substring(markpos);  
    if (urlParams && urlParams !== '') {
      var urlParamsA = urlParams.substring(1).split('&');      
      for (var i = 0, ix = urlParamsA.length; i < ix; ++i) {
        var parts = urlParamsA[i].split('=');        
        ret.params.push({key: parts[0], value: parts[1]});
      }      
    }
  } else ret.host = url;
  return ret;
}

/**
* Tracking Function: updates a view/visit from requestheaders
* @param sessionID
* @param requestHeaders
* @param additionaldData - additional data to store into adnoce-session (see schema), transfered to updateSessionData
* @return false if no sessionID or url (referer) was provided, true otherwise
*/
var pushTrackingData = function(sessionID, requestHeaders, additionalData) {  
  var url = normalizeURL(requestHeaders.referer);
  if (!sessionID || !url) return false;
  if (additionalData && additionalData !== null && typeof(additionalData) === 'object') {   
    additionalData.userAgent = requestHeaders['user-agent'];    
  } else {
    additionalData = {userAgent : requestHeaders['user-agent'], adnocetype : 100}    
  } 
  var newTrackingData = new models.AdnoceVisit();
  newTrackingData.url = url.host;
  if (url.params.length > 0) newTrackingData.urlquery = url.params;
  newTrackingData.sessionId = sessionID;
  newTrackingData.save(function(err) {
    if (err) log.error(err);
    else {
      updateSessionData(sessionID, null, additionalData, function(error, updata){
        if (io && updata) {          
          if (!updata.adnocetype) updata.adnocetype = parseInt(additionalData.adnocetype, 10);          
          io.emit('trackingdata', mergeJSObjects(newTrackingData.toJSON(), updata));  
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
* @param persistentSessionID (optional)f
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
* adds an generic event
*/
var addEvent = function(type, name, sessionId, additionalData, callback) {    
  var newEvent = new models.AdnoceEvent();
  newEvent.adnocetype = type;  
  newEvent.sessionId = sessionId;
  if (name) newEvent.eventname = name;
  if (additionalData) newEvent.data = additionalData;
  newEvent.save(function(error) {
    if (error === null) io.emit('trackingdata', newEvent);    
    if (typeof(callback) === 'function') callback(error, newEvent);
  });
};
exports.addEvent = addEvent;

/**
* Merges two js objects (beware: no collision check, first arg wins)
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
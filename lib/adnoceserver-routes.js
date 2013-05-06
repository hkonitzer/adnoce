var db = require('mongoose');
var Log = require('log'), log = new Log('info');
var mr = require('./mapreduce.js'),
  models = require('./databasemodels.js');

var log = new Log('info');

var CDNURL = '';

/* Views */
exports.index = function(req, res, next) {
  res.render('index', { cdnurl: CDNURL });    
}

/** DB API generic */
exports.genericDBAPI = function(req, res) { 
  res.set({'Content-Type': 'application/json', 'Cache-Control' : 'no-cache,no-store,must-revalidate'});
  try {
    var query = req.query;          
    var opts = {};
    var limit = 100;
    for (q in query) {              
      try {
        if (q === 'limit') limit = parseInt(query[q]);
        else if (q === 'sort') sort = query[q];
        else {
          opts[q] = JSON.parse(query[q]);
        }
      } catch (ex) {
        opts[q] = query[q];
      }
    }    
    var qry = models[req.params.collection].find(opts).limit(limit).sort(sort).lean(true);
    var qrystream = qry.stream();
    data = [];
    qrystream.on('data', function(doc) {      
      data.push(doc);      
    });
    qrystream.on('error', function(err) {
      log.error('adnoce server - stream on /api/db/ %s', err);
      res.send(500, JSON.stringify({data: null, error: err, returncode:'FAILED'}));
    });
    qrystream.on('close', function () {
      res.send(200, JSON.stringify({data: data, returncode:'SUCCESS'}));
    });        
  } catch (ex) {          
    if (req.params && req.params.collection) log.error('adnoce server - /api/db/%s Error: %s', req.params.collection, ex);
    else log.error('adnoce server - /api/db (req.params.collection unknown) Error: %s ', ex);           
    res.send(500, JSON.stringify({message: 'Error', error: ex.toString(), returncode:'FAILED'}));
  }
}

/** MAP/REDUCE API generic */
exports.genericMRAPI = function(req, res) { 
  res.set({'Content-Type': 'application/json', 'Cache-Control' : 'no-cache,no-store,must-revalidate'});        
  try {
    var query = req.query;          
    var opts = {};
    var limit = 100;
    for (q in query) {              
      try {
        if (q === 'limit') limit = parseInt(query[q], 10);
        else {
          opts[q] = JSON.parse(query[q]);
        }
      } catch (ex) {
        opts[q] = query[q];
      }
    }           
    mr.getData(req.params.collection, opts, limit, function(err,data){
      if (err) {
        res.send(500, JSON.stringify({data: null, err: err, message: 'Error', returncode:'FAILED'}));                    
      } else {                    
        if (data)
          res.send(200, JSON.stringify({data: data, returncode:'SUCCESS'}));
      }                
    });
  } catch (ex) {          
    if (req.params && req.params.collection) log.error('adnoce server -/api/%s Error: %s', req.params.collection, ex);
    else log.error('adnoce server - /api/adnoce (req.params.collection unknown) Error: %s ', ex);           
    res.send(500, JSON.stringify({message: 'Error', error: ex.toString(), returncode:'FAILED'}));
  }
};


var endResponseWith405 = function(response, allowedMethods) {
  if (typeof(allowedMethods) !== 'string') var allowedMethods  = 'GET,POST';
  response.writeHead(405, {'Allow': allowedMethods});
  response.end();
}
var endResponseWith404 = function(response) {    
  response.set('Content-Type', 'text/plain');
  response.send(404, 'file not found');  
}
var endResponseWith400 = function(response) {    
  response.set('Content-Type', 'text/plain');
  response.send(400, 'error retriving the file for given parameters');  
}
var db = require('mongoose');
var Log = require('log'), log = new Log('info');
var mr = require('./mapreduce.js');

var log = new Log('info');

var CDNURL = '';

/* Views */
exports.index = function(req, res, next) {
  res.render('index', { cdnurl: CDNURL });    
}

/* API generic */
exports.genericAPI = function(req, res) { 
console.log('GENERIC API HIT', req.params)       
  res.set({'Content-Type': 'application/json', 'Cache-Control' : 'no-cache,no-store,must-revalidate'});        
  try {
    var query = req.query;          
    var opts = {};
    var limit = 100;
    for (q in query) {              
      try {
        if (q === 'limit') limit = parseInt(query[q]);
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
    if (req.params && req.params.collection) log.error('/api/%s Error: %s', req.params.collection, ex);
    else log.error('/api/adnoce (req.params.collection unknown) Error: %s ', ex);           
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
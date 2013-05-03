var CDNURL = '';

exports.index = function(req, res, next) {
    res.render('index', { cdnurl: CDNURL });    
}

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
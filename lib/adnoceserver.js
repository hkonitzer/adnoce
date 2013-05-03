var http = require('http'), https = require('https'), url = require('url'), fs = require('fs'),    
    db = require('mongoose'),       
    connect = require('connect'),   
    express = require('express'),
    routes = require('./adnoceserver-routes.js'),    
    adnoce = require('./adnoce'),
    Log = require('log');

var log = new Log('info');

var app = express();

module.exports = function (options) {

    "use strict";

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


    app.get('/', routes.index);

    // external
    app.get('/jquery-1.9.1.min.js', function (req, res) {
        res.set('Content-Type', 'application/javascript');        
        fs.readFile(__dirname + '/external/jquery-1.9.1.min.js', 'utf8', function(err, data){            
            if (err === null) res.send(200, data);  
            else res.send(404);            
        });
    });


    var server = http.createServer(app);    
    server.listen(config.server.port, config.server.host, function() {
        log.info('adnoce server "%s" running on Port %s', config.server.host, config.server.port);  
    });
    var io = require('socket.io').listen(server);
    io.configure(function (){
        io.set('log level', 1);
    });

    var ioc = require('socket.io-client');
    var adnocesocket = ioc.connect(config.server.adnocehost+':'+config.server.adnoceport+'/'+config.server.socketnamespace, {reconnect: true});    
    
    adnocesocket.on('trackingdata', function(data){
        io.sockets.emit('trackingdata', data);    
    });
}
var should = require('should');
var db = require('mongoose');
var q = require('promised-io/promise');
var Deferred = q.Deferred;

// Tests with DB
var models = require(__dirname+'/../lib/databasemodels.js');
var clienttracking = require(__dirname+'/../lib/clienttracking.js');
var adnoce = require(__dirname+'/../lib/adnoce.js');
var serverroutes = require(__dirname+'/../lib/adnoceserver-routes.js');   

var saveIntoDBPromise = function(model_) {
  var deferred = new Deferred();
  model_.save(function(err) {
    if (err === null) deferred.resolve(model_);
    else deferred.reject(err);
  });
  return deferred.promise;  
}

var removeFromDBPromise = function(model_, query_) {
  var deferred = new Deferred();
  model_.remove(query_, function(err) {
    if (err === null) deferred.resolve(query_);
    else deferred.reject(err);
  });
  return deferred.promise;  
}

describe('Database', function(){

  var testVisit = new models.AdnoceVisit();
  var testEvent = new models.AdnoceEvent();
  var testSession = new models.AdnoceSession();
  var savePromises = [];
  var deletePromises = [];

  before(function(done) {
    adnoce.setDatabase({host : 'localhost', name : 'adoncetest'}, function() {
      testVisit.sessionId = 'unittest';
      testVisit.url = 'http://www.example.com';
      testVisit.urlquery = { key: 'key', value: 'value' };
      savePromises.push(saveIntoDBPromise(testVisit));
      testEvent.sessionId = 'unittest';
      testEvent.adnocetype = 200;
      testEvent.eventname = 'testing';
      testEvent.data = { key: 'key', value: 'value' };
      savePromises.push(saveIntoDBPromise(testEvent));
      testSession.sessionId = 'unittest';
      testSession.persistentSessionId = 'p-unittest';
      testSession.userAgent = 'ua-test';
      testSession.data = { key: 'key', value: 'value' };
      savePromises.push(saveIntoDBPromise(testSession));
      var group = q.all(savePromises);     
      group.then(function(resultArray){    
        if (resultArray.length != savePromises.length) {
          if (resultArray.length === 0) done('models setup failed! resultArray is empty');
          else done('models setup failed! resultArray.length is ' + resultArray.length + ', should '+savePromises.length);
        } else done();
      });
      
    });
  });

  after(function(done) {
    deletePromises.push(removeFromDBPromise(models.AdnoceVisit, {sessionId : 'unittest'}));
    deletePromises.push(removeFromDBPromise(models.AdnoceVisit, {sessionId : 'unittest1'}));
    deletePromises.push(removeFromDBPromise(models.AdnoceEvent, {sessionId : 'unittest'}));
    deletePromises.push(removeFromDBPromise(models.AdnoceEvent, {sessionId : 'unittest1'}));
    deletePromises.push(removeFromDBPromise(models.AdnoceSession, {sessionId : 'unittest'}));
    var group = q.all(deletePromises);     
      group.then(function(resultArray){    
        if (resultArray.length != deletePromises.length) {
          if (resultArray.length === 0) done('models remove failed! resultArray is empty');
          else done('models remove failed! resultArray.length is ' + resultArray.length + ', should '+deletePromises.length);
        } else done();             
      });
  });

  describe('test Visit Model Setup', function() {
    it('respond with matching records', function(done) {
      models.AdnoceVisit.findOne({_id : testVisit._id}, function(err, res) {
         if (err) return done(err);        
        res.should.have.property('sessionId');
        res.should.have.property('url');
        res['sessionId'].should.be.equal('unittest');
        res['url'].should.be.equal('http://www.example.com');
        done();      
      });      
    })
  });

  describe('test Event Model Setup', function() {
    it('respond with matching records', function(done) {
      models.AdnoceEvent.findOne({_id : testEvent._id}, function(err, res) {
        if (err) return done(err);        
        res.should.have.property('sessionId');
        res.should.have.property('adnocetype');
        res.should.have.property('eventname');
        res['sessionId'].should.be.equal('unittest');
        res['adnocetype'].should.be.equal(200);
        res['eventname'].should.be.equal('testing');
        done();      
      });      
    })
  });

  describe('test Session Model Setup', function() {
    it('respond with matching records', function(done) {
      models.AdnoceSession.findOne({_id : testSession._id}, function(err, res) {
        if (err) return done(err); 
        res.should.have.property('sessionId');
        res.should.have.property('persistentSessionId');
        res.should.have.property('userAgent');
        res['sessionId'].should.be.equal('unittest');        
        res['persistentSessionId'].should.be.equal('p-unittest');
        res['userAgent'].should.be.equal('ua-test');
        done();      
      });      
    })
  });
  
  describe('clienttracking functions', function() {
    var sessionID = 'unittest1';
    var psessionID = 'p-' + sessionID;
    var requestHeaders = { 'referer': 'http://www.example.com/test', 'user-agent': 'user-agent for testing' };
    var additionalData = { key: 'key', value: 'value' };
  
    describe('#pushTrackingData', function() {      
      it('respond with matching records', function(done) {      
        clienttracking.pushTrackingData(sessionID, requestHeaders, additionalData, function(err, res) {
          if (err !== null) done(err);
          else {
            res.should.have.property('_id');
            res.should.have.property('sessionId');
            res.should.have.property('url');
            res.should.have.property('urlquery');
            res.should.have.property('userAgent');
            res.should.have.property('adnocetype');
            res.should.have.property('timestamp');
            res['sessionId'].should.be.equal(sessionID);
            res['url'].should.be.equal(requestHeaders['referer']);
            res['userAgent'].should.be.equal(requestHeaders['user-agent']);
            res['adnocetype'].should.be.equal(1);
            done();  
          }
        });
      });
      it('should session data be updated with visit data', function(done) {      
        models.AdnoceSession.findOne({ sessionId: sessionID}, function(err, res) {
          if (err !== null) done(err);
          else {
            res.should.have.property('_id');
            res.should.have.property('sessionId');           
            res.should.have.property('userAgent');           
            res.should.have.property('timestamp');
            res['sessionId'].should.be.equal(sessionID);
            res['userAgent'].should.be.equal(requestHeaders['user-agent']);
            done();  
          }
        });
      });
    });
    describe('#updateSessionData', function() { 
      it('should be updated with persistent session id="'+psessionID+'"', function(done) { 
        clienttracking.updateSessionData(sessionID, psessionID, null, function(err, res) {
          if (err !== null) done(err);
          else {
            res.should.have.property('_id');
            res.should.have.property('sessionId');
            res.should.have.property('persistentSessionId');
            res.should.have.property('userAgent');           
            res.should.have.property('timestamp');
            res.should.have.property('data');
            res['sessionId'].should.be.equal(sessionID);
            res['persistentSessionId'].should.be.equal(psessionID);
            res['userAgent'].should.be.equal(requestHeaders['user-agent']);
            done(); 
          }
        });
      });
      it('should have an adnocetype="1"', function(done) { 
        clienttracking.updateSessionData(sessionID, psessionID, { adnocetype: 1 }, function(err, res) {
          if (err !== null) done(err);
          else {
            res.should.have.property('adnocetype');            
            res['adnocetype'].should.be.equal(1);
            done(); 
          }
        });
      });
    });
    describe('#addEvent', function() { 
      var eventname = 'testevent';
      var testEventData = {key: 'testkey', value : 'testvalue'};
      it('should be updated with data, type and name', function(done) {
        clienttracking.addEvent(100, eventname, sessionID, testEventData, function(err, res) {
          if (err !== null) done(err);
          else {
            res.should.have.property('_id');            
            res.should.have.property('adnocetype');
            res.should.have.property('eventname');           
            res.should.have.property('sessionId');
            res.should.have.property('data');
            res['data'].should.be.an.instanceOf(Array);
            res.should.have.property('timestamp');
            res['adnocetype'].should.be.equal(100);
            res['eventname'].should.be.equal(eventname);
            res['sessionId'].should.be.equal(sessionID);            
            res['data'].should.have.length(1);            
            res['data'][0].key.should.be.equal(testEventData.key);
            res['data'][0].value.should.be.equal(testEventData.value);
            done(); 
          }
        });
      });
    });
  });

  describe('adnoce-server functions', function() {
    describe('#genericDBAPI', function() {  
      //@TODO
    });
  });
});
var should = require('should');

// Tests without DB
var clienttracking = require(__dirname+'/../lib/clienttracking.js');
describe('clienttracking', function(){
  describe('#getClientTrackingScript(sessionID)', function(){
    it('should return a string with sessionID', function(){
      // fake request object
      var request = {sessionID: 'TESTSESSIONID-ABC123'};
      var answer = clienttracking.getClientTrackingScript(request);      
      answer.should.match(/TESTSESSIONID-ABC123/);      
    })
  })
})

describe('clienttracking', function(){
  describe('#normalizeURL(url) with empty query params', function(){
    it('should return an object with host (string) and empty params (array)', function(){
      var answer = clienttracking.normalizeURL('http://www.example.com');      
      answer.should.have.property('host');
      answer.should.have.property('params');
      answer['host'].should.be.equal('http://www.example.com');
      answer['params'].should.be.an.instanceOf(Array);
      answer['params'].should.have.length(0);
    })
  })
})

describe('clienttracking', function(){
  describe('#normalizeURL(url) with query 2 params', function(){
    it('should return an object with host (string) and params (array with length 2 and key/value objects)', function(){
      var answer = clienttracking.normalizeURL('http://www.example.com?param1=A&param2=B');      
      answer.should.have.property('host');
      answer.should.have.property('params');
      answer['host'].should.be.equal('http://www.example.com');
      answer['params'].should.be.an.instanceOf(Array);
      answer['params'].should.have.length(2);
      answer['params'][0].should.have.property('key');
      answer['params'][0]['key'].should.be.equal('param1');
      answer['params'][0].should.have.property('value');
      answer['params'][0]['value'].should.be.equal('A');
      answer['params'][1].should.have.property('key');
      answer['params'][1]['key'].should.be.equal('param2');
      answer['params'][1].should.have.property('value');
      answer['params'][1]['value'].should.be.equal('B');
    })
  })
})

describe('clienttracking', function(){
  describe('#mergeJSObjects(...) with two objects', function(){
    it('should return an merged objects from given arguments', function(){
      var answer = clienttracking.mergeJSObjects({'A' : 1 , 'B' : '2'});      
      answer.should.have.property('A');
      answer.should.have.property('B');
      answer['A'].should.be.equal(1);
      answer['B'].should.be.equal('2');      
    })
  })
})

// Tests with DB connection

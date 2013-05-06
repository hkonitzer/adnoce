var db = require('mongoose');

var sendMapReduceCommand = function(commandObject, callback) {  
  var startTime = new Date().getTime();
  db.connection.db.executeDbCommand(commandObject, function(err, dbres) {
    if (err) log.error(err);
    if (typeof callback == 'function') callback(err, dbres, new Date().getTime()-startTime);
  });
}

const visitsTotalMap = ''+
"function() {"+
"var url = this.url;"+
"emit(url, {visits: 1});"+
"}";

const visitsTotal_Reduce = ''+
'function(key, values) {'+
'var total = 0;'+
'var imax = values.length;'+
'if (imax === 0) return {visits: 0};'+
'for (var i = 0, imax = values.length; i < imax; ++i) { var v = values[i].visits; if (typeof(v) === "number") total = total + v; }'+
'if (isNaN(total)) return {visits: 0};'+
'else return {visits: total};'+
'}';

const visitsTotalByMonth_Map = ''+
"function() {"+
"var url = this.url;"+
"var emitObj = { count: 1, month: null, year: null };"+ 
"var date = new Date(this.timestamp);"+ 
"emitObj.month = date.getMonth() +1;"+
"emitObj.year = date.getFullYear();"+ 
"emit(url, emitObj);"+
"}"
;

const visitsTotalByMonth_Reduce = ''+
"function(key, values) {"+
"var retObj = { month: {}, year: {} };"+      
"for (var i = 0, imax = values.length; i < imax; ++i) {"+ 
"  if (typeof(retObj.month[values[i].month]) === 'number') {"+
"    retObj.month[values[i].month] += values[i].count;"+
"  } else {"+
"    retObj.month[values[i].month] = values[i].count;"+
"  }"+
"  if (typeof(retObj.year[values[i].year]) === 'number') {"+
"    retObj.year[values[i].year] += values[i].count;"+
"  } else {"+
"    retObj.year[values[i].year] = values[i].count;"+
"  }"+  
"};"+ 
"return retObj;"+
"}"
;


const visitsTotalByHour_Map = ''+
"function() {"+
"var url = this.url;"+
"var emitObj = { visits: 1, day: null, month: null, year: null, hour: null };"+ 
"var date = new Date(this.timestamp);"+
"emitObj.day = date.getDate();"+
"emitObj.month = date.getMonth() + 1;"+
"emitObj.year = date.getFullYear();"+
"emitObj.hour = date.getHours();"+  
"emit(url, emitObj);"+
"}"
;

const visitsTotalByHour_Reduce = ''+
'function(key, values) {'+
'var retObj = { };'+
'for (var i = 0, imax = values.length; i < imax; ++i) {'+
'    if (typeof(values[i].year) === "undefined") {'+
'       continue;'+
'    }'+
'  if (typeof(retObj[values[i].year]) === "object") {'+    
'    retObj[values[i].year].visits += values[i].visits;'+
'  } else {'+ 
'    retObj[values[i].year] = { visits: values[i].visits };'+
'  }'+
'  if (typeof(retObj[values[i].year][values[i].month]) === "object") {'+
'    retObj[values[i].year][values[i].month].visits += values[i].visits;'+
'  } else {'+
'    retObj[values[i].year][values[i].month] = { visits: values[i].visits };'+
'  }'+  
'  if (typeof(retObj[values[i].year][values[i].month][values[i].day]) === "object") {'+
'    retObj[values[i].year][values[i].month][values[i].day].visits += values[i].visits;'+
'  } else {'+
'    retObj[values[i].year][values[i].month][values[i].day] = { visits: values[i].visits };'+
'  }'+  
'  if (typeof(retObj[values[i].year][values[i].month][values[i].day][values[i].hour]) === "object") {'+
'    retObj[values[i].year][values[i].month][values[i].day][values[i].hour].visits += values[i].visits;'+
'  } else {'+
'    retObj[values[i].year][values[i].month][values[i].day][values[i].hour] = { visits: values[i].visits };'+
'  }'+
'};'+
'return retObj;'+
'}'
;

const userAgentsTotal_Map = ''+
"function() {"+
"var emitObj = { count: 1  };"+ 
"emit(this.userAgent, emitObj);"+
"}"
;

const userAgentsTotal_Reduce = ''+
"function(key, values) {"+
"var total = 0;"+ 
"for (var i = 0; i < values.length; ++i) { total += values[i].count; }; "+
"return {count: total};"+
"}"
;

var MapReduce = {
  visitsTotal : function(callback) {
    sendMapReduceCommand({ mapreduce: 'adnoce-visits', map: visitsTotalMap, reduce: visitsTotal_Reduce, out: 'adnoce-mr-visitstotal' }, callback);
  },
  visitsTotalByHour : function(callback) {
    sendMapReduceCommand({ mapreduce: 'adnoce-visits', map: visitsTotalByHour_Map, reduce: visitsTotalByHour_Reduce, out: 'adnoce-mr-visitstotalbyhour' }, callback);
  },
  visitsTotalByMonth : function(callback) {
    sendMapReduceCommand({ mapreduce: 'adnoce-visits', map: visitsTotalByMonth_Map, reduce: visitsTotalByMonth_Reduce, out: 'adnoce-mr-visitstotalbymonth' }, callback);
  },
  userAgentsTotal : function(callback) {
    sendMapReduceCommand({ mapreduce: 'adnoce-sessions', map: userAgentsTotal_Map, reduce: userAgentsTotal_Reduce, out: 'adnoce-mr-useragentstotal' }, callback);
  }
}
exports.MapReduce = MapReduce;

exports.getData = function(collectionName, param, limit, callback) {
  var l = limit || 100;
  if (collectionName.indexOf('adnoce-mr-') === -1) collectionName = 'adnoce-mr-'+collectionName;
  db.connection.db.collection(collectionName, function(err, collection) { //query the new map-reduced table        
    var cursor = collection.find().sort({ value: -1}).limit(l);
    var stream = cursor.stream();
    var data = [];
    var error = null;
    stream.on('error', function(err) {
      error = err;
    });
    stream.on('data', function (d1, d2) {         
      data.push(d1);
    });
    stream.on('close', function(){    
      callback(error, data);
    });      
   });
}
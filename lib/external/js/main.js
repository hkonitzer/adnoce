/* BACKBONE */
/* BACKBONE: Performance */
var PerfomanceModel = Backbone.Model.extend({
  defaults: {    
    "reqcounter"  : 0,
    "reqmax"      : 0,
    "reqtrend"    : 0, // -1 = negative trend, +1 positive trend    
  },
  addRequest: function() {    
    this.set('reqcounter', this.get('reqcounter') + 1);
  },
  reset: function(p1) {    
    // update max
    if (this.get('reqcounter') > this.get('reqmax')) {
      this.set('reqmax', this.get('reqcounter'));
      this.set('reqtrend', 1);
    } else if (this.get('reqcounter') === this.get('reqmax')) {
      this.set('reqtrend', 0);
    } else {
      this.set('reqtrend', -1);
    }
    this.set('reqcounter', 0);
  }
});
var PerformanceView = Backbone.View.extend({  
  title: null,
  initialize: function(opts_) {
    this.title = opts_.title || '';
    this.listenTo(this.model, 'add', this.render);
    this.listenTo(this.model, 'change:reqcounter', this.updateCounter);
    this.listenTo(this.model, 'change:reqmax', this.updateMax);
    this.listenTo(this.model, 'change:reqtrend', this.updateTrend);
    this.render(this.model);
  },
  render : function(model) {    
    this.$el.append('<div>'+this.title+':&thinsp;<span id="perfcounter_'+model.cid+'">?</span>&thinsp;Trend:&thinsp;<span id="perftrend_'+model.cid+'">?</span>&thinsp;Max:&thinsp;<span id="perfmax_'+model.cid+'">0</span></div>');
    this.updateCounter(model);    
    this.updateMax(model);
  },
  updateCounter : function(model) {
    $('#perfcounter_'+model.cid).text(model.get('reqcounter'));    
  },
  updateMax : function(model) {
    $('#perfmax_'+model.cid).text(model.get('reqmax'));   
    $('#perfmax_'+model.cid).attr('title', moment().format('H:mm:ss')); 
  },
  updateTrend : function(model) {
    var trendSymbol = null;
    if (model.get('reqtrend') < 0) trendSymbol = '-';
    else if (model.get('reqtrend') > 0) trendSymbol = '+';
    else trendSymbol = '=';
    $('#perftrend_'+model.cid).text(trendSymbol);    
  }
});
/* BACKBONE: Log view */
var LogLine = Backbone.Model.extend({
  idAttribute: '_id',
  initialize: function(data) {         
    if (data.persistentSessionId) this.set({nPSessionId: this.normalizeSessionId(data.persistentSessionId)});
    this.set({nSessionId: this.normalizeSessionId(data.sessionId)});
    var u = this.normalizeURL(data.url);
    this.set('url-host', u.host);
    this.set('url-path', u.path);
    this.set('url-protocol', u.protocol);
  },
  normalizeSessionIdRegEx: /[^\w]/g,
  normalizeSessionId: function(sessionId_) {
    if (!sessionId_) return null;
    return sessionId_.replace(this.normalizeSessionIdRegEx,'').substring(0,6);      
  },
  normalizeURLRegEx: new RegExp(/^(http|ftp|https):\/\/(.*)\/(.*)/),
  normalizeURL: function(url_) {      
    var erg = this.normalizeURLRegEx.exec(url_);      
    return { protocol : erg[1], host: erg[2], path: '/'+erg[3] };
  }

});
var LogLineView = Backbone.View.extend({
  model: LogLine
});
var LogLineList = Backbone.Collection.extend({
  maxEntries: null,      
  model: LogLine,
  initialize: function(data, options) {
    this.maxEntries = options.maxEntries || 30;                
  }
});

var LogView = Backbone.View.extend({
  datalog: null,
  el: $("#log"),
  lastLoglineTimestamp: null, // last log recieved
  // mustache style templating, because default style is already used by ejs
  //template: _.template('<div class="logline {{sid}}"></div>', null, { interpolate : /\{\{(.+?)\}\}/g }), 
  initialize: function(options) {       
    this.listenTo(this.model, 'add', this.render);
    this.lastLoglineTimestamp = moment();                    
    if (options.showdatalogline === false) this.datalog = false; else this.datalog = true;        
  },
  render : function(model) {
    var maxReached = (model.collection.maxEntries < model.collection.length);
    if (maxReached) {
      this.$el.find(':first').remove();
      model.collection.shift();

    }
    // init div
    var loglinediv = $('<div>', {'class' : 'logline '+model.get('nSessionId'), style: 'display: none;'});      
    // create time difference for last request
    var ts = moment(new Date(model.get('timestamp')));   
    var diff = ts.diff(this.lastLoglineTimestamp);
    if (diff <= 1000) difftext = diff+'ms';
    else {        
      diff = Math.round(diff / 1000);
      if (diff <= 60) difftext = diff+'s';          
      else {          
        diff = Math.round(diff / 60);
        if (diff <= 60) difftext = diff+'m';
        else {
          diff = Math.round(diff / 60);
          if (diff <= 60) difftext = diff+'h';
        }
      }
    }
    this.lastLoglineTimestamp = ts; 
    // add timestamps
    loglinediv.append('<div class="loglinecontent timediff">'+difftext+'</div>');
    loglinediv.append('<div class="loglinecontent timestamp">'+ts.format('H:mm:ss.SSS')+'</div>');
    // add session id (normalized) with user agent as title
    var ua = model.get('userAgent') || 'n/a';
    loglinediv.append('<div class="loglinecontent sid" title="'+ua+'">'+model.get('nSessionId')+'</div>');
    // add counter element for this particular event (data itself is added later; retrieved from server)
    var counterDiv = $('<div>', {'class' : 'loglinecontent counter'});        
    loglinediv.append(counterDiv);
    switch(model.get('adnocetype')) {
      default:
        // add url
        loglinediv.append('<div class="loglinecontent url" title="'+model.get('url-host')+'">'+model.get('url-path')+'</div>');   
    }    
    // add additonaldata recieved as key/value pairs
    var dataloglineDiv = null;
    if (this.datalog) dataloglineDiv = $('<div>', {'class' : 'loglinecontentbot'});        
    var additionalData = model.get('data');
    // iterate additional data, because we need the view counter var always (all other can be surpressed)
    if (additionalData && additionalData.length > 0) {
      for (var d = 0, dmax = additionalData.length; d < dmax; ++d) {                    
        if (additionalData[d].key === 'views') { // add views
          counterDiv.text(additionalData[d].value);
          if (!this.datalog) break; else continue; // go away if additional log line is unwanted
        }
        if (!this.datalog) continue;          
        else dataloglineDiv.append('<div class="loglinecontent datastore '+additionalData[d].key+'">'+additionalData[d].key+':'+additionalData[d].value+'</div>');      
      }
    }        
    if (this.datalog) loglinediv.append(dataloglineDiv);
    // done, add the whole log line
    this.$el.append(loglinediv);
    loglinediv.fadeIn('slow'); 
  }
});
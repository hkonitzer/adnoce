var db = require('mongoose'), Schema = db.Schema;

var _AdnoceVisit = new Schema({
  id                : Schema.ObjectId,
  url               : { type: String, required: true, trim: true },
  sessionId         : { type: String, required: true, trim: true, index: { sparse: true } },
  timestamp         : { type: Date, default: Date.now, required: true }
}, { autoIndex: true, versionKey: false });
_AdnoceVisit.index()
var AdnoceVisitModel = db.model('adnoce-visit', _AdnoceVisit);
exports.AdnoceVisit = AdnoceVisitModel;

var _AdnoceSession = new Schema({
  id                  : Schema.ObjectId,
  persistentSessionId : { type: String, required: false, trim: true, index: { sparse: false } },
  sessionId           : { type: String, required: true, trim: true, index: { sparse: true } },
  userAgent           : { type: String, required: false, trim: true },
  userType            : { type: Number, default: 0, required: true }, // 1 = user object in session 
  timestamp           : { type: Date, default: Date.now, required: true }
}, { autoIndex: true, versionKey: false });
_AdnoceSession.index({ persistentSessionId: 1, sessionId: 1 });
var AdnoceSessionModel = db.model('adnoce-session', _AdnoceSession);
exports.AdnoceSession = AdnoceSessionModel;

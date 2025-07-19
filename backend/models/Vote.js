const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  safety: { type: String, enum: ['safe', 'unsafe'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vote', VoteSchema);








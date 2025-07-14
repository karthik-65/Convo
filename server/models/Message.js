const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  file: { type: String },
  fileName: { type: String, default: '' },    // original file name
  fileSize: { type: Number, default: 0 },     // file size in bytes
  fileType: { type: String, default: '' },  
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

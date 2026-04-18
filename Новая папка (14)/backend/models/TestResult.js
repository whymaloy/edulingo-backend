const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number }], // indexes of chosen answers
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  percentage: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestResult', testResultSchema);

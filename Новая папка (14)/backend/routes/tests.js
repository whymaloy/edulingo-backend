const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');

// GET /api/tests - All tests
router.get('/', auth, async (req, res) => {
  try {
    const tests = await Test.find().populate('teacherId', 'username').populate('lessonId', 'title').sort({ createdAt: -1 });
    // Hide correct answers from students
    const data = tests.map(t => {
      const obj = t.toObject();
      if (req.user.role === 'student') {
        obj.questions = obj.questions.map(q => {
          const { correctAnswer, ...rest } = q;
          return rest;
        });
      }
      return obj;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/tests/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('lessonId', 'title');
    if (!test) return res.status(404).json({ msg: 'Test not found' });
    const obj = test.toObject();
    if (req.user.role === 'student') {
      obj.questions = obj.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// POST /api/tests - Create test (teacher only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  const { title, lessonId, questions } = req.body;
  if (!title || !questions || !questions.length) return res.status(400).json({ msg: 'Title and questions required' });

  try {
    const test = new Test({ title, lessonId: lessonId || null, teacherId: req.user.id, questions });
    await test.save();
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// DELETE /api/tests/:id (teacher only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  try {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Test deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// POST /api/tests/:id/submit - Student submits test
router.post('/:id/submit', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Only students can submit tests' });
  const { answers } = req.body; // array of answer indexes

  try {
    const existing = await TestResult.findOne({ testId: req.params.id, studentId: req.user.id });
    if (existing) return res.status(400).json({ msg: 'You have already submitted this test' });

    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ msg: 'Test not found' });

    let score = 0;
    test.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) score++;
    });
    const total = test.questions.length;
    const percentage = Math.round((score / total) * 100);

    const result = new TestResult({ testId: test._id, studentId: req.user.id, answers, score, total, percentage });
    await result.save();

    res.json({ score, total, percentage, msg: `You scored ${score}/${total} (${percentage}%)` });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/tests/results/my - Student's own results
router.get('/results/my', auth, async (req, res) => {
  try {
    const results = await TestResult.find({ studentId: req.user.id }).populate('testId', 'title').sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/tests/results/all - Teacher sees all results
router.get('/results/all', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  try {
    const results = await TestResult.find().populate('testId', 'title').populate('studentId', 'username').sort({ submittedAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Homework = require('../models/Homework');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// GET /api/homework - All homework assignments
router.get('/', auth, async (req, res) => {
  try {
    const hw = await Homework.find().populate('teacherId', 'username').populate('lessonId', 'title').sort({ createdAt: -1 });
    res.json(hw);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/homework/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const hw = await Homework.findById(req.params.id).populate('teacherId', 'username').populate('submissions.studentId', 'username');
    if (!hw) return res.status(404).json({ msg: 'Homework not found' });
    res.json(hw);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// POST /api/homework - Create homework (teacher only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  const { title, description, lessonId, dueDate } = req.body;
  if (!title || !description) return res.status(400).json({ msg: 'Title and description required' });
  try {
    const hw = new Homework({ title, description, lessonId: lessonId || null, teacherId: req.user.id, dueDate: dueDate || null });
    await hw.save();
    res.status(201).json(hw);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// DELETE /api/homework/:id (teacher only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  try {
    await Homework.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Homework deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// POST /api/homework/:id/submit - Student submits homework
router.post('/:id/submit', auth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ msg: 'Only students can submit homework' });
  try {
    const hw = await Homework.findById(req.params.id);
    if (!hw) return res.status(404).json({ msg: 'Homework not found' });

    const alreadySubmitted = hw.submissions.find(s => s.studentId.toString() === req.user.id);
    if (alreadySubmitted) return res.status(400).json({ msg: 'Already submitted' });

    const submission = {
      studentId: req.user.id,
      answerText: req.body.answerText || '',
      fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
      status: 'submitted'
    };
    hw.submissions.push(submission);
    await hw.save();
    res.json({ msg: 'Homework submitted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// PUT /api/homework/:id/grade/:submissionId - Teacher grades submission
router.put('/:id/grade/:submissionId', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  const { grade, feedback } = req.body;
  try {
    const hw = await Homework.findById(req.params.id);
    if (!hw) return res.status(404).json({ msg: 'Homework not found' });

    const sub = hw.submissions.id(req.params.submissionId);
    if (!sub) return res.status(404).json({ msg: 'Submission not found' });

    sub.grade = grade;
    sub.feedback = feedback || '';
    sub.status = 'graded';
    await hw.save();
    res.json({ msg: 'Graded successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;

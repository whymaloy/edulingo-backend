const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Lesson = require('../models/Lesson');

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// GET /api/lessons - All lessons (authenticated)
router.get('/', auth, async (req, res) => {
  try {
    const lessons = await Lesson.find().populate('teacherId', 'username').sort({ createdAt: -1 });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// GET /api/lessons/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('teacherId', 'username');
    if (!lesson) return res.status(404).json({ msg: 'Lesson not found' });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// POST /api/lessons - Create lesson (teacher only)
router.post('/', auth, upload.array('materials', 5), async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  const { title, description, videoUrl } = req.body;
  if (!title || !description) return res.status(400).json({ msg: 'Title and description required' });

  try {
    const materials = (req.files || []).map(f => ({
      fileName: f.originalname,
      fileUrl: `/uploads/${f.filename}`
    }));
    const lesson = new Lesson({ title, description, videoUrl: videoUrl || '', materials, teacherId: req.user.id });
    await lesson.save();
    res.status(201).json(lesson);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// PUT /api/lessons/:id - Edit lesson (teacher only)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lesson) return res.status(404).json({ msg: 'Lesson not found' });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// DELETE /api/lessons/:id - Delete lesson (teacher only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ msg: 'Access denied' });
  try {
    await Lesson.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Lesson deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;

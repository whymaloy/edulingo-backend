// ─── Auth guard ───────────────────────────────────────────────────────────────
const currentUser = getUser();
if (!currentUser || currentUser.role !== 'teacher') {
  window.location.href = 'index.html';
}

// ─── State ────────────────────────────────────────────────────────────────────
let allLessons = [], allTests = [], allHomework = [], allResults = [], allSubmissions = [];
let gradeTarget = null; // { hwId, submissionId }
let testQuestions = [];

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('sb-avatar').textContent = initials(currentUser.username);
  document.getElementById('sb-name').textContent = currentUser.username;
  await loadAll();
});

async function loadAll() {
  showLoading();
  try {
    [allLessons, allTests, allHomework, allResults] = await Promise.all([
      Lessons.all(), Tests.all(), Homework.all(), Tests.allResults()
    ]);

    // Collect all submissions across homework
    allSubmissions = [];
    allHomework.forEach(hw => {
      (hw.submissions || []).forEach(s => {
        allSubmissions.push({ ...s, hwTitle: hw.title, hwId: hw._id });
      });
    });

    updateStats();
    renderLessons();
    renderTests();
    renderHomework();
    renderProgress();
    renderSubmissions();
    renderDashboardWidgets();
  } catch (err) {
    showToast('Failed to load data: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-lessons').textContent = allLessons.length;
  document.getElementById('stat-tests').textContent = allTests.length;
  document.getElementById('stat-hw').textContent = allHomework.length;
  document.getElementById('stat-submissions').textContent = allSubmissions.length;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const sectionMap = {
  dashboard:   'Dashboard',
  lessons:     'Lessons',
  tests:       'Tests',
  homework:    'Homework',
  progress:    'Student Progress',
  submissions: 'Submissions'
};
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  document.getElementById('page-title').textContent = sectionMap[name] || name;
  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}
function logout() {
  clearAuth(); window.location.href = 'index.html';
}
function handleModalClick(e, id) {
  if (e.target.id === id) closeModal(id);
}

// ─── Dashboard Widgets ────────────────────────────────────────────────────────
function renderDashboardWidgets() {
  // Recent results
  const rrEl = document.getElementById('recent-results');
  if (allResults.length === 0) {
    rrEl.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No results yet</p></div>';
  } else {
    rrEl.innerHTML = allResults.slice(0, 5).map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
        <div class="avatar avatar-sm">${initials(r.studentId?.username || '?')}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.studentId?.username || 'Student')}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(r.testId?.title || 'Test')}</div>
        </div>
        <span class="badge ${r.percentage >= 70 ? 'badge-green' : r.percentage >= 40 ? 'badge-yellow' : 'badge-red'}">${r.percentage}%</span>
      </div>`).join('');
  }

  // Pending submissions
  const psEl = document.getElementById('pending-submissions-widget');
  const pending = allSubmissions.filter(s => s.status === 'submitted');
  if (pending.length === 0) {
    psEl.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>All caught up!</p></div>';
  } else {
    psEl.innerHTML = pending.slice(0, 5).map(s => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
        <div class="avatar avatar-sm">${initials(s.studentId?.username || '?')}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.88rem;font-weight:600;">${escapeHtml(s.studentId?.username || 'Student')}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(s.hwTitle || 'Homework')}</div>
        </div>
        <span class="badge badge-yellow">Pending</span>
      </div>`).join('');
  }
}

// ─── Lessons ──────────────────────────────────────────────────────────────────
function renderLessons() {
  const grid = document.getElementById('lessons-grid');
  if (allLessons.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📖</div><p>No lessons yet. Create your first!</p></div>';
    return;
  }
  grid.innerHTML = allLessons.map(l => `
    <div class="lesson-card" onclick="viewLesson('${l._id}')">
      <div class="lesson-card-thumb">🎓</div>
      <div class="lesson-card-body">
        <div class="lesson-card-title">${escapeHtml(l.title)}</div>
        <div class="lesson-card-desc">${escapeHtml(l.description)}</div>
        <div class="lesson-card-meta">
          <span class="lesson-card-teacher">📅 ${formatDate(l.createdAt)}</span>
          <div class="lesson-card-actions" onclick="event.stopPropagation()">
            <button class="btn btn-danger btn-sm" onclick="deleteLesson('${l._id}')">🗑</button>
          </div>
        </div>
      </div>
    </div>`).join('');
}

async function submitLesson(e) {
  e.preventDefault();
  const btn = document.getElementById('l-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating…';
  const fd = new FormData();
  fd.append('title', document.getElementById('l-title').value.trim());
  fd.append('description', document.getElementById('l-desc').value.trim());
  fd.append('videoUrl', document.getElementById('l-video').value.trim());
  const files = document.getElementById('l-files').files;
  for (const f of files) fd.append('materials', f);

  try {
    await Lessons.create(fd);
    showToast('Lesson created!', 'success');
    closeModal('modal-lesson');
    document.getElementById('lesson-form').reset();
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Create Lesson';
  }
}

async function deleteLesson(id) {
  if (!confirm('Delete this lesson? This cannot be undone.')) return;
  try {
    await Lessons.delete(id);
    showToast('Lesson deleted.', 'info');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewLesson(id) {
  showLoading();
  try {
    const l = await Lessons.get(id);
    document.getElementById('lv-title').textContent = l.title;
    const videoHtml = l.videoUrl
      ? `<div class="lesson-video-wrap"><iframe src="${escapeHtml(l.videoUrl)}" allowfullscreen></iframe></div>`
      : `<div class="lesson-video-wrap"><div class="lesson-video-placeholder"><div class="play-icon">▶️</div><p>No video for this lesson</p></div></div>`;
    const matsHtml = l.materials && l.materials.length
      ? l.materials.map(m => `<a class="material-item" href="http://localhost:5000${m.fileUrl}" target="_blank">📄 ${escapeHtml(m.fileName)}</a>`).join('')
      : '<p style="color:var(--text-muted);font-size:0.85rem;">No materials uploaded.</p>';
    document.getElementById('lesson-view-body').innerHTML = `
      ${videoHtml}
      <p style="color:var(--text-secondary);margin-bottom:20px;">${escapeHtml(l.description)}</p>
      <p class="lesson-section-title">Materials</p>
      <div class="materials-list">${matsHtml}</div>`;
    openModal('modal-lesson-view');
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
function renderTests() {
  const el = document.getElementById('tests-list');
  if (allTests.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>No tests yet. Create your first!</p></div>';
    return;
  }
  el.innerHTML = allTests.map(t => `
    <div class="test-item">
      <div class="hw-info">
        <h4>${escapeHtml(t.title)}</h4>
        <p>${t.questions ? t.questions.length : 0} questions &nbsp;|&nbsp; ${t.lessonId ? escapeHtml(t.lessonId.title || '') : 'No lesson linked'}</p>
        <div class="hw-meta">📅 ${formatDate(t.createdAt)}</div>
      </div>
      <div class="hw-actions">
        <button class="btn btn-danger btn-sm" onclick="deleteTest('${t._id}')">🗑 Delete</button>
      </div>
    </div>`).join('');
}

function openCreateTest() {
  testQuestions = [];
  document.getElementById('test-title').value = '';
  populateLessonDropdown('test-lesson');
  renderQuestions();
  openModal('modal-test');
}

function addQuestion() {
  testQuestions.push({ questionText: '', options: ['', '', '', ''], correctAnswer: 0 });
  renderQuestions();
}

function renderQuestions() {
  const el = document.getElementById('questions-container');
  if (testQuestions.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:28px 0;"><div class="icon">❓</div><p>Add at least one question</p></div>';
    return;
  }
  el.innerHTML = testQuestions.map((q, qi) => `
    <div class="card" style="padding:18px;margin-bottom:12px;cursor:default;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong style="font-size:0.9rem;">Question ${qi + 1}</strong>
        <button class="btn btn-danger btn-sm" onclick="removeQuestion(${qi})">✕</button>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <input class="form-control" type="text" placeholder="Question text" value="${escapeHtml(q.questionText)}" oninput="testQuestions[${qi}].questionText=this.value" />
      </div>
      ${q.options.map((opt, oi) => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <input type="radio" name="correct-${qi}" ${q.correctAnswer === oi ? 'checked' : ''} onchange="testQuestions[${qi}].correctAnswer=${oi}" title="Mark as correct" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer;" />
          <input class="form-control" style="margin:0;" type="text" placeholder="Option ${oi + 1}" value="${escapeHtml(opt)}" oninput="testQuestions[${qi}].options[${oi}]=this.value" />
        </div>`).join('')}
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">🔘 Select the radio button next to the correct answer</p>
    </div>`).join('');
}

function removeQuestion(qi) {
  testQuestions.splice(qi, 1);
  renderQuestions();
}

async function submitTest() {
  const title = document.getElementById('test-title').value.trim();
  const lessonId = document.getElementById('test-lesson').value;
  if (!title) return showToast('A test title is required.', 'error');
  if (testQuestions.length === 0) return showToast('Add at least one question.', 'error');

  const invalid = testQuestions.find(q => !q.questionText.trim() || q.options.some(o => !o.trim()));
  if (invalid) return showToast('Fill in all question texts and options.', 'error');

  try {
    await Tests.create({ title, lessonId: lessonId || null, questions: testQuestions });
    showToast('Test created!', 'success');
    closeModal('modal-test');
    testQuestions = [];
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTest(id) {
  if (!confirm('Delete this test?')) return;
  try {
    await Tests.delete(id);
    showToast('Test deleted.', 'info');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Homework ─────────────────────────────────────────────────────────────────
function renderHomework() {
  const el = document.getElementById('homework-list');
  if (allHomework.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No homework yet. Assign some!</p></div>';
    return;
  }
  el.innerHTML = allHomework.map(h => {
    const total = h.submissions ? h.submissions.length : 0;
    const graded = h.submissions ? h.submissions.filter(s => s.status === 'graded').length : 0;
    return `
      <div class="hw-item">
        <div class="hw-info">
          <h4>${escapeHtml(h.title)}</h4>
          <p>${escapeHtml(h.description.substring(0, 90))}${h.description.length > 90 ? '…' : ''}</p>
          <div class="hw-meta">📥 ${total} submission${total !== 1 ? 's' : ''} &nbsp;|&nbsp; ✅ ${graded} graded${h.dueDate ? ` &nbsp;|&nbsp; 📅 Due ${formatDate(h.dueDate)}` : ''}</div>
        </div>
        <div class="hw-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteHomework('${h._id}')">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');
}

function populateLessonDropdown(selectId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">— No specific lesson —</option>' +
    allLessons.map(l => `<option value="${l._id}">${escapeHtml(l.title)}</option>`).join('');
}

async function submitHomework(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('hw-title').value.trim(),
    description: document.getElementById('hw-desc').value.trim(),
    lessonId: document.getElementById('hw-lesson').value || null,
    dueDate: document.getElementById('hw-due').value || null
  };
  try {
    await Homework.create(body);
    showToast('Homework assigned!', 'success');
    closeModal('modal-homework');
    document.getElementById('hw-form').reset();
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
// Override openModal to handle hidden class and populate dropdowns
const origOpenModal = openModal;
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'modal-homework') populateLessonDropdown('hw-lesson');
  if (id === 'modal-test') populateLessonDropdown('test-lesson');
  el.classList.remove('hidden');
  el.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};
window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  document.body.style.overflow = '';
};

async function deleteHomework(id) {
  if (!confirm('Delete this homework assignment?')) return;
  try {
    await Homework.delete(id);
    showToast('Homework deleted.', 'info');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── Progress ─────────────────────────────────────────────────────────────────
function renderProgress() {
  const el = document.getElementById('progress-list');
  if (allResults.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No test results yet</p></div>';
    return;
  }

  // Group by student
  const byStudent = {};
  allResults.forEach(r => {
    const name = r.studentId?.username || 'Unknown';
    if (!byStudent[name]) byStudent[name] = [];
    byStudent[name].push(r);
  });

  el.innerHTML = Object.entries(byStudent).map(([name, results]) => {
    const avg = Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length);
    return `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">🎓 ${escapeHtml(name)} (${results.length} test${results.length !== 1 ? 's' : ''})</span>
          <span class="progress-pct">${avg}%</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar" style="width:${avg}%"></div>
        </div>
      </div>`;
  }).join('');
}

// ─── Submissions ──────────────────────────────────────────────────────────────
function renderSubmissions() {
  const tbody = document.getElementById('submissions-table-body');
  if (allSubmissions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No submissions yet</td></tr>';
    return;
  }
  tbody.innerHTML = allSubmissions.map(s => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar avatar-sm">${initials(s.studentId?.username || '?')}</div>${escapeHtml(s.studentId?.username || 'Student')}</div></td>
      <td>${escapeHtml(s.hwTitle || '—')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.answerText || '—')}</td>
      <td>${formatDate(s.submittedAt)}</td>
      <td><span class="badge ${s.status === 'graded' ? 'badge-green' : 'badge-yellow'}">${s.status}</span>${s.status === 'graded' ? `<span style="font-size:0.78rem;color:var(--text-muted);margin-left:6px;">${s.grade}/100</span>` : ''}</td>
      <td>
        ${s.status === 'submitted'
          ? `<button class="btn btn-primary btn-sm" onclick="openGradeModal('${s.hwId}','${s._id}','${escapeHtml(s.answerText || '')}')">Grade</button>`
          : `<span style="color:var(--text-muted);font-size:0.82rem;">Graded</span>`}
      </td>
    </tr>`).join('');
}

function openGradeModal(hwId, subId, answerText) {
  gradeTarget = { hwId, subId };
  document.getElementById('grade-score').value = '';
  document.getElementById('grade-feedback').value = '';
  document.getElementById('grade-submission-preview').innerHTML = `
    <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:6px;">Student Answer:</p>
    <p style="font-size:0.9rem;">${escapeHtml(answerText) || '<em style="color:var(--text-muted)">No text answer (file submission)</em>'}</p>`;
  openModal('modal-grade');
}

async function submitGrade() {
  if (!gradeTarget) return;
  const grade = parseInt(document.getElementById('grade-score').value);
  const feedback = document.getElementById('grade-feedback').value.trim();
  if (isNaN(grade) || grade < 0 || grade > 100) return showToast('Enter a valid grade (0–100)', 'error');

  const btn = document.getElementById('grade-submit-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await Homework.grade(gradeTarget.hwId, gradeTarget.subId, { grade, feedback });
    showToast('Grade submitted!', 'success');
    closeModal('modal-grade');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit Grade';
  }
}

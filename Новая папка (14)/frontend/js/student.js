// ─── Auth guard ───────────────────────────────────────────────────────────────
const currentUser = getUser();
if (!currentUser || currentUser.role !== 'student') {
  window.location.href = 'index.html';
}

// ─── Modal override (handle hidden class) ────────────────────────────────────
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
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

// ─── State ────────────────────────────────────────────────────────────────────
let allLessons = [], allTests = [], allHomework = [], myResults = [];
let activeTestId = null, activeTestData = null, studentAnswers = [];
let activeHwId = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('sb-avatar').textContent = initials(currentUser.username);
  document.getElementById('sb-name').textContent = currentUser.username;
  await loadAll();
});

async function loadAll() {
  showLoading();
  try {
    [allLessons, allTests, allHomework, myResults] = await Promise.all([
      Lessons.all(), Tests.all(), Homework.all(), Tests.myResults()
    ]);
    updateStats();
    renderDashboardWidgets();
    renderLessons();
    renderTests();
    renderHomework();
    renderResults();
  } catch (err) {
    showToast('Failed to load data: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-lessons').textContent = allLessons.length;
  document.getElementById('stat-tests-done').textContent = myResults.length;

  // Count submitted homework
  const hwDone = allHomework.filter(hw =>
    hw.submissions && hw.submissions.some(s => s.studentId === currentUser.id || s.studentId?._id === currentUser.id)
  ).length;
  document.getElementById('stat-hw-done').textContent = hwDone;

  const avg = myResults.length
    ? Math.round(myResults.reduce((a, r) => a + r.percentage, 0) / myResults.length)
    : null;
  document.getElementById('stat-avg-score').textContent = avg !== null ? avg + '%' : '—';
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const sectionMap = { dashboard: 'Dashboard', lessons: 'Lessons', tests: 'Tests', homework: 'Homework', results: 'My Results' };
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
function logout() { clearAuth(); window.location.href = 'index.html'; }
function handleModalClick(e, id) { if (e.target.id === id) closeModal(id); }

// ─── Dashboard Widgets ────────────────────────────────────────────────────────
function renderDashboardWidgets() {
  // Recent Lessons
  const lEl = document.getElementById('widget-lessons');
  if (allLessons.length === 0) {
    lEl.innerHTML = '<div class="empty-state" style="padding:20px 0;"><div class="icon" style="font-size:2rem;">📖</div><p>No lessons yet</p></div>';
  } else {
    lEl.innerHTML = allLessons.slice(0, 4).map(l => `
      <div onclick="viewLesson('${l._id}')" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-subtle);cursor:pointer;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">
        <div style="width:38px;height:38px;border-radius:8px;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">📖</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.9rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(l.title)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${formatDate(l.createdAt)}</div>
        </div>
      </div>`).join('');
  }

  // My Scores
  const sEl = document.getElementById('widget-scores');
  if (myResults.length === 0) {
    sEl.innerHTML = '<div class="empty-state" style="padding:20px 0;"><div class="icon" style="font-size:2rem;">📊</div><p>No tests taken yet</p></div>';
  } else {
    sEl.innerHTML = myResults.slice(0, 4).map(r => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:0.85rem;">
          <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">${escapeHtml(r.testId?.title || 'Test')}</span>
          <span class="badge ${r.percentage >= 70 ? 'badge-green' : r.percentage >= 40 ? 'badge-yellow' : 'badge-red'}">${r.percentage}%</span>
        </div>
        <div class="progress-wrap" style="height:5px;">
          <div class="progress-bar" style="width:${r.percentage}%;${r.percentage < 40 ? 'background:var(--red);' : r.percentage < 70 ? 'background:var(--yellow);' : ''}"></div>
        </div>
      </div>`).join('');
  }
}

// ─── Lessons ──────────────────────────────────────────────────────────────────
function renderLessons() {
  const grid = document.getElementById('lessons-grid');
  if (allLessons.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📖</div><p>No lessons available yet</p></div>';
    return;
  }
  grid.innerHTML = allLessons.map(l => `
    <div class="lesson-card" onclick="viewLesson('${l._id}')">
      <div class="lesson-card-thumb">🎓</div>
      <div class="lesson-card-body">
        <div class="lesson-card-title">${escapeHtml(l.title)}</div>
        <div class="lesson-card-desc">${escapeHtml(l.description)}</div>
        <div class="lesson-card-meta">
          <span class="lesson-card-teacher">👨‍🏫 ${escapeHtml(l.teacherId?.username || 'Teacher')}</span>
          <span class="badge badge-accent">View</span>
        </div>
      </div>
    </div>`).join('');
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
      ? l.materials.map(m => `<a class="material-item" href="http://localhost:5000${m.fileUrl}" target="_blank" download>📄 ${escapeHtml(m.fileName)}</a>`).join('')
      : '<p style="color:var(--text-muted);font-size:0.85rem;">No materials uploaded.</p>';
    document.getElementById('lesson-view-body').innerHTML = `
      ${videoHtml}
      <p style="color:var(--text-secondary);margin-bottom:20px;">${escapeHtml(l.description)}</p>
      <p class="lesson-section-title">📎 Materials</p>
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
    el.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>No tests available yet</p></div>';
    return;
  }
  el.innerHTML = allTests.map(t => {
    const done = myResults.find(r => r.testId?._id === t._id || r.testId === t._id);
    return `
      <div class="test-item">
        <div class="hw-info">
          <h4>${escapeHtml(t.title)}</h4>
          <p>${t.questions ? t.questions.length : 0} questions${t.lessonId ? ' &nbsp;|&nbsp; 📖 ' + escapeHtml(t.lessonId.title || '') : ''}</p>
          ${done ? `<div class="hw-meta">✅ Completed &nbsp;• &nbsp;<span class="badge ${done.percentage >= 70 ? 'badge-green' : done.percentage >= 40 ? 'badge-yellow' : 'badge-red'}">${done.percentage}% — ${done.score}/${done.total}</span></div>` : ''}
        </div>
        <div class="hw-actions">
          ${done
            ? `<span class="badge badge-green" style="font-size:0.82rem;">Done</span>`
            : `<button class="btn btn-primary btn-sm" onclick="startTest('${t._id}')">▶ Take Test</button>`}
        </div>
      </div>`;
  }).join('');
}

async function startTest(id) {
  showLoading();
  try {
    const test = await Tests.get(id);
    activeTestId = id;
    activeTestData = test;
    studentAnswers = new Array(test.questions.length).fill(null);
    renderTestModal(test);
    openModal('modal-test-take');
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
}

function renderTestModal(test) {
  document.getElementById('test-take-title').textContent = test.title;
  document.getElementById('test-take-body').innerHTML = `
    <div class="quiz-wrapper">
      ${test.questions.map((q, qi) => `
        <div class="question-card">
          <div class="quiz-progress">Question ${qi + 1} of ${test.questions.length}</div>
          <div class="question-text">${escapeHtml(q.questionText)}</div>
          <div class="options-list">
            ${q.options.map((opt, oi) => `
              <div class="option-item" id="opt-${qi}-${oi}" onclick="selectAnswer(${qi}, ${oi})">
                <div class="option-radio"></div>
                ${escapeHtml(opt)}
              </div>`).join('')}
          </div>
        </div>`).join('')}
      <button class="btn btn-primary w-full" style="padding:14px;" onclick="submitTest()">Submit Test</button>
    </div>`;
}

function selectAnswer(qi, oi) {
  studentAnswers[qi] = oi;
  // Deselect all options for this question
  activeTestData.questions[qi].options.forEach((_, i) => {
    document.getElementById(`opt-${qi}-${i}`)?.classList.remove('selected');
  });
  document.getElementById(`opt-${qi}-${oi}`)?.classList.add('selected');
}

async function submitTest() {
  const unanswered = studentAnswers.findIndex(a => a === null);
  if (unanswered !== -1) {
    showToast(`Please answer question ${unanswered + 1} before submitting.`, 'error');
    return;
  }
  showLoading();
  try {
    const result = await Tests.submit(activeTestId, { answers: studentAnswers });
    closeModal('modal-test-take');
    showResultModal(result);
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally { hideLoading(); }
}

function showResultModal(result) {
  const pct = result.percentage;
  document.getElementById('result-emoji').textContent = pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : pct >= 40 ? '📚' : '💪';
  document.getElementById('result-headline').textContent = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Well done!' : pct >= 40 ? 'Keep studying!' : 'Keep it up!';
  document.getElementById('result-details').textContent = result.msg;
  document.getElementById('result-score').textContent = `${result.score}/${result.total}`;
  const bar = document.getElementById('result-bar');
  bar.style.width = pct + '%';
  bar.style.background = pct >= 70 ? '' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
  openModal('modal-test-result');
}

// ─── Homework ─────────────────────────────────────────────────────────────────
function renderHomework() {
  const el = document.getElementById('homework-list');
  if (allHomework.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No homework assigned yet</p></div>';
    return;
  }
  el.innerHTML = allHomework.map(hw => {
    const mySubmission = hw.submissions?.find(s =>
      s.studentId === currentUser.id || s.studentId?._id === currentUser.id
    );
    return `
      <div class="hw-item">
        <div class="hw-info">
          <h4>${escapeHtml(hw.title)}</h4>
          <p>${escapeHtml(hw.description.substring(0, 120))}${hw.description.length > 120 ? '…' : ''}</p>
          <div class="hw-meta">
            👨‍🏫 ${escapeHtml(hw.teacherId?.username || 'Teacher')}
            ${hw.dueDate ? ` &nbsp;|&nbsp; 📅 Due ${formatDate(hw.dueDate)}` : ''}
            ${mySubmission ? ` &nbsp;|&nbsp; <span class="badge ${mySubmission.status === 'graded' ? 'badge-green' : 'badge-yellow'}">${mySubmission.status}</span>` : ''}
            ${mySubmission?.grade != null ? ` &nbsp;|&nbsp; Grade: <strong>${mySubmission.grade}/100</strong>` : ''}
          </div>
          ${mySubmission?.feedback ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary);padding:8px 12px;background:var(--bg-secondary);border-radius:6px;">💬 ${escapeHtml(mySubmission.feedback)}</div>` : ''}
        </div>
        <div class="hw-actions">
          ${mySubmission
            ? `<span class="badge badge-green">Submitted</span>`
            : `<button class="btn btn-primary btn-sm" onclick="openHwSubmit('${hw._id}','${escapeHtml(hw.title)}','${escapeHtml(hw.description.replace(/'/g, "\\'"))}')">📤 Submit</button>`}
        </div>
      </div>`;
  }).join('');
}

function openHwSubmit(id, title, desc) {
  activeHwId = id;
  document.getElementById('hw-submit-title').textContent = 'Submit: ' + title;
  document.getElementById('hw-submit-desc').innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">Instructions:</p><p style="font-size:0.9rem;">${escapeHtml(desc)}</p>`;
  document.getElementById('hw-answer-text').value = '';
  document.getElementById('hw-answer-file').value = '';
  openModal('modal-hw-submit');
}

async function submitHomeworkAnswer() {
  if (!activeHwId) return;
  const btn = document.getElementById('hw-submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting…';

  const fd = new FormData();
  fd.append('answerText', document.getElementById('hw-answer-text').value.trim());
  const file = document.getElementById('hw-answer-file').files[0];
  if (file) fd.append('file', file);

  try {
    await Homework.submit(activeHwId, fd);
    showToast('Homework submitted!', 'success');
    closeModal('modal-hw-submit');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Submit';
  }
}

// ─── Results ──────────────────────────────────────────────────────────────────
function renderResults() {
  const rEl = document.getElementById('results-list');
  if (myResults.length === 0) {
    rEl.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>No tests taken yet. Start one!</p></div>';
  } else {
    rEl.innerHTML = myResults.map(r => `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">📝 ${escapeHtml(r.testId?.title || 'Test')} <span style="color:var(--text-muted);font-size:0.78rem;">${formatDate(r.submittedAt)}</span></span>
          <span class="progress-pct">${r.score}/${r.total}</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar" style="width:${r.percentage}%;${r.percentage < 40 ? 'background:var(--red);' : r.percentage < 70 ? 'background:var(--yellow);' : ''}"></div>
        </div>
        <div style="text-align:right;margin-top:4px;font-size:0.75rem;color:var(--text-muted);">${r.percentage}%</div>
      </div>`).join('');
  }

  // Homework grades
  const gEl = document.getElementById('hw-grades-list');
  const gradedHw = allHomework
    .map(hw => {
      const sub = hw.submissions?.find(s => s.studentId === currentUser.id || s.studentId?._id === currentUser.id);
      return sub ? { title: hw.title, ...sub } : null;
    })
    .filter(Boolean);

  if (gradedHw.length === 0) {
    gEl.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>No homework submitted yet</p></div>';
  } else {
    gEl.innerHTML = gradedHw.map(g => `
      <div class="hw-item" style="cursor:default;">
        <div class="hw-info">
          <h4>${escapeHtml(g.title)}</h4>
          <p style="font-size:0.82rem;">${escapeHtml(g.answerText || 'File submission')}</p>
          ${g.feedback ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary);">💬 ${escapeHtml(g.feedback)}</div>` : ''}
        </div>
        <div class="hw-actions">
          ${g.status === 'graded'
            ? `<div style="text-align:center;"><div style="font-size:1.5rem;font-weight:800;color:var(--accent-light);">${g.grade}</div><div style="font-size:0.72rem;color:var(--text-muted);">/ 100</div></div>`
            : `<span class="badge badge-yellow">Pending Review</span>`}
        </div>
      </div>`).join('');
  }
}

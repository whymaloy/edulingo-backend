// ─── API Base URL ───────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';

// ─── Token helpers ───────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('lms_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('lms_user') || 'null'); }
function setAuth(token, user) {
  localStorage.setItem('lms_token', token);
  localStorage.setItem('lms_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('lms_token');
  localStorage.removeItem('lms_user');
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (let browser set boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.msg || `Error ${res.status}`);
  }
  return data;
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────
const Auth = {
  login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Lessons endpoints ───────────────────────────────────────────────────────
const Lessons = {
  all:    ()          => apiFetch('/lessons'),
  get:    (id)        => apiFetch(`/lessons/${id}`),
  create: (formData)  => apiFetch('/lessons', { method: 'POST', body: formData }),
  update: (id, body)  => apiFetch(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id)        => apiFetch(`/lessons/${id}`, { method: 'DELETE' }),
};

// ─── Tests endpoints ─────────────────────────────────────────────────────────
const Tests = {
  all:        ()           => apiFetch('/tests'),
  get:        (id)         => apiFetch(`/tests/${id}`),
  create:     (body)       => apiFetch('/tests', { method: 'POST', body: JSON.stringify(body) }),
  delete:     (id)         => apiFetch(`/tests/${id}`, { method: 'DELETE' }),
  submit:     (id, body)   => apiFetch(`/tests/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  myResults:  ()           => apiFetch('/tests/results/my'),
  allResults: ()           => apiFetch('/tests/results/all'),
};

// ─── Homework endpoints ──────────────────────────────────────────────────────
const Homework = {
  all:    ()                   => apiFetch('/homework'),
  get:    (id)                 => apiFetch(`/homework/${id}`),
  create: (body)               => apiFetch('/homework', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id)                 => apiFetch(`/homework/${id}`, { method: 'DELETE' }),
  submit: (id, formData)       => apiFetch(`/homework/${id}/submit`, { method: 'POST', body: formData }),
  grade:  (id, subId, body)    => apiFetch(`/homework/${id}/grade/${subId}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function showLoading() {
  let el = document.getElementById('global-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loading';
    el.className = 'loading-overlay';
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
}
function hideLoading() {
  const el = document.getElementById('global-loading');
  if (el) el.style.display = 'none';
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

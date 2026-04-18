// Auth page logic

// Redirect if already logged in
(function() {
  const u = getUser();
  const t = getToken();
  if (u && t) {
    window.location.href = u.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
  }
})();

let selectedRole = 'student';

function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab === 'register');
  document.getElementById('register-form').classList.toggle('hidden', tab === 'login');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function selectRole(role) {
  selectedRole = role;
  document.getElementById('selected-role').value = role;
  document.getElementById('role-student').classList.toggle('active', role === 'student');
  document.getElementById('role-teacher').classList.toggle('active', role === 'teacher');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const data = await Auth.login({ username, password });
    setAuth(data.token, data.user);
    showToast('Welcome back, ' + data.user.username + '!', 'success');
    setTimeout(() => {
      window.location.href = data.user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
    }, 600);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const errEl = document.getElementById('reg-error');
  errEl.style.display = 'none';

  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const role = document.getElementById('selected-role').value;

  if (password !== password2) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const data = await Auth.register({ username, password, role });
    setAuth(data.token, data.user);
    showToast('Account created! Welcome, ' + data.user.username + '!', 'success');
    setTimeout(() => {
      window.location.href = data.user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
    }, 600);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ============ Configuration ============
const API_BASE_URL = 'https://pipi-walk-backend.vercel.app'; // Empty = same origin; set to 'https://your-backend.vercel.app' when deployed separately

// ============ Quick Step Presets ============
const QUICK_STEPS = [
  { value: 1000, emoji: '🚶', label: '散步一下' },
  { value: 3000, emoji: '🏃', label: '輕鬆健走' },
  { value: 5000, emoji: '🏅', label: '日常達標' },
  { value: 10000, emoji: '🏆', label: '運動達人' },
];

// ============ State ============
const state = {
  isLoggedIn: false,
  user: null, // { appToken, userId, loginToken, nickname, account }
  todaySteps: 0,
  loading: false,
};

// ============ DOM Refs ============
const screens = ['screen-onboarding', 'screen-login', 'screen-dashboard'];
const stepCountEl = document.getElementById('step-count-display');
const loginForm = document.getElementById('login-form');
const btnStart = document.getElementById('btn-start');
const btnBackTutorial = document.getElementById('btn-back-tutorial');
const btnTogglePwd = document.getElementById('btn-toggle-pwd');
const pwdInput = document.getElementById('login-password');
const btnLogout = document.getElementById('btn-logout');
const toastEl = document.getElementById('toast');
const customToggleBtn = document.getElementById('btn-toggle-custom');
const customPanel = document.getElementById('custom-step-panel');
const customChevron = document.getElementById('custom-chevron');
const btnCustomSubmit = document.getElementById('btn-custom-submit');
const customInput = document.getElementById('custom-step-input');

// ============ Screen Management ============
function showScreen(screenId) {
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (id === screenId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// ============ Animated Counter ============
function animateCount(element, from, to, duration = 800) {
  const startTime = performance.now();
  
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeOutCubic(progress);
    
    const currentCount = Math.round(from + (to - from) * easeProgress);
    element.innerText = currentCount.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.innerText = to.toLocaleString();
    }
  }
  
  requestAnimationFrame(update);
}

// ============ Toast System ============
let toastTimeout;
function showToast(message, type = 'success') {
  toastEl.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check text-green-400' : 'fa-triangle-exclamation text-red-400'}"></i>
    <span>${message}</span>
  `;
  
  toastEl.className = 'toast';
  toastEl.classList.add(`toast-${type}`);
  
  // Force reflow
  void toastEl.offsetWidth;
  
  toastEl.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

// ============ Onboarding ============
function initOnboarding() {
  const isDone = localStorage.getItem('pipi_onboarding_done');
  
  if (isDone) {
    checkAutoLogin();
  } else {
    showScreen('screen-onboarding');
  }
}

btnStart.addEventListener('click', () => {
  localStorage.setItem('pipi_onboarding_done', 'true');
  showScreen('screen-login');
});

btnBackTutorial.addEventListener('click', () => {
  showScreen('screen-onboarding');
});

// ============ Login ============
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.loading) return;
  
  const account = document.getElementById('login-account').value.trim();
  const password = pwdInput.value;
  const nickname = document.getElementById('login-nickname').value.trim();
  
  const errorBanner = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  const btnSubmit = document.getElementById('btn-login-submit');
  const spinner = btnSubmit.querySelector('.spinner');
  
  errorBanner.classList.add('hidden');
  state.loading = true;
  spinner.classList.remove('hidden');
  btnSubmit.disabled = true;
  
  try {
    const res = await fetch(API_BASE_URL + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || '登入失敗，請檢查帳號密碼');
    }
    
    const userPayload = {
      appToken: data.app_token,
      userId: data.user_id,
      loginToken: data.login_token,
      account: account,
      nickname: nickname || account.split('@')[0]
    };
    
    localStorage.setItem('pipi_auth', JSON.stringify(userPayload));
    state.user = userPayload;
    
    showToast('登入成功！');
    showDashboard();
    
  } catch (err) {
    errorText.innerText = err.message;
    errorBanner.classList.remove('hidden');
  } finally {
    state.loading = false;
    spinner.classList.add('hidden');
    btnSubmit.disabled = false;
  }
});

btnTogglePwd.addEventListener('click', () => {
  const type = pwdInput.type === 'password' ? 'text' : 'password';
  pwdInput.type = type;
  btnTogglePwd.innerHTML = type === 'password' 
    ? '<i class="fa-regular fa-eye"></i>' 
    : '<i class="fa-regular fa-eye-slash"></i>';
});

// ============ Auto Login ============
function checkAutoLogin() {
  const authStr = localStorage.getItem('pipi_auth');
  if (authStr) {
    try {
      const auth = JSON.parse(authStr);
      if (auth.appToken && auth.userId) {
        state.user = auth;
        showDashboard();
        return;
      }
    } catch(e) {}
  }
  showScreen('screen-login');
}

// ============ Dashboard ============
async function showDashboard() {
  state.isLoggedIn = true;
  showScreen('screen-dashboard');
  
  document.getElementById('user-nickname-display').innerText = state.user.nickname;
  
  const d = new Date();
  const monthStr = `${d.getFullYear()}年${d.getMonth()+1}月`;
  document.getElementById('leaderboard-month-badge').innerText = monthStr;
  
  renderQuickSteps();
  
  // Load today steps from Firebase
  const todaySteps = await getUserTodaySteps(state.user.userId);
  state.todaySteps = todaySteps;
  animateCount(stepCountEl, 0, todaySteps);
  
  // Subscribe to leaderboard
  subscribeLeaderboard(state.user.userId);
}

// ============ Quick Steps Rendering ============
function renderQuickSteps() {
  const grid = document.getElementById('quick-steps-grid');
  grid.innerHTML = '';
  
  QUICK_STEPS.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'step-btn';
    btn.innerHTML = `
      <div class="text-3xl mb-1">${preset.emoji}</div>
      <div class="step-btn-number">+${preset.value.toLocaleString()}</div>
      <div class="step-btn-label">${preset.label}</div>
    `;
    
    btn.addEventListener('click', () => submitSteps(preset.value, btn));
    grid.appendChild(btn);
  });
}

// ============ Step Submission ============
async function submitSteps(steps, sourceBtn = null) {
  if (state.loading || !state.user) return;
  state.loading = true;
  
  let spinner = null;
  if (sourceBtn) {
    sourceBtn.style.opacity = '0.7';
    sourceBtn.style.pointerEvents = 'none';
  } else if (btnCustomSubmit) {
    spinner = btnCustomSubmit.querySelector('.spinner');
    spinner.classList.remove('hidden');
    btnCustomSubmit.disabled = true;
  }
  
  try {
    const res = await fetch(API_BASE_URL + '/api/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_token: state.user.appToken,
        user_id: state.user.userId,
        steps: steps
      })
    });
    
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || '步數修改失敗');
    
    // Update Firebase
    const displayName = state.user.nickname || state.user.account.split('@')[0];
    await updateLeaderboardEntry(state.user.userId, displayName, steps);
    
    // Update UI
    const oldSteps = state.todaySteps;
    state.todaySteps += steps;
    animateCount(stepCountEl, oldSteps, state.todaySteps);
    
    showToast(`🎉 成功新增 ${steps.toLocaleString()} 步！`);
    
    if (customInput) customInput.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    state.loading = false;
    if (sourceBtn) {
      sourceBtn.style.opacity = '1';
      sourceBtn.style.pointerEvents = 'auto';
    }
    if (spinner) {
      spinner.classList.add('hidden');
      btnCustomSubmit.disabled = false;
    }
  }
}

// ============ Custom Steps ============
customToggleBtn.addEventListener('click', () => {
  customPanel.classList.toggle('hidden');
  if (!customPanel.classList.contains('hidden')) {
    customChevron.style.transform = 'rotate(180deg)';
    setTimeout(() => customInput.focus(), 50);
  } else {
    customChevron.style.transform = 'rotate(0deg)';
  }
});

btnCustomSubmit.addEventListener('click', () => {
  const steps = parseInt(customInput.value, 10);
  if (isNaN(steps) || steps <= 0) {
    showToast('請輸入有效的步數', 'error');
    return;
  }
  if (steps > 100000) {
    showToast('單次步數不能超過 100,000', 'error');
    return;
  }
  submitSteps(steps);
});

// ============ Logout ============
btnLogout.addEventListener('click', () => {
  if (confirm('確定要登出嗎？')) {
    localStorage.removeItem('pipi_auth');
    unsubscribeLeaderboard();
    state.user = null;
    state.todaySteps = 0;
    state.isLoggedIn = false;
    stepCountEl.innerText = '0';
    showScreen('screen-login');
  }
});

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', () => {
  initOnboarding();
});

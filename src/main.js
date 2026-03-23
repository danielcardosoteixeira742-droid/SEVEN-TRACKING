import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// --- ESTADO DO JOGO E BANCO DE DADOS (LOCALSTORAGE) ---
const state = {
  playerName: 'USER',
  dpi: 800,
  sens: 0.20,
  isPlaying: false,
  score: 0,
  mode: 0,
  isDay: false,
  hasGunAttached: false
};

const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const hud = document.getElementById('hud');
const authForm = document.getElementById('auth-form');

const registerFields = document.getElementById('register-fields');
const authDPIInput = document.getElementById('authDPI');
const authSensInput = document.getElementById('authSens');
const dashGridPlay = document.getElementById('dash-grid-play');
const dashPageProfile = document.getElementById('dash-page-profile');
const dashPageConfig = document.getElementById('dash-page-config');
const dashPageTitle = document.getElementById('dash-page-title');
const btnDashPlay = document.getElementById('btn-dash-play');

const playerNameDisplay = document.getElementById('playerNameDisplay');
const dashUsername = document.getElementById('dash-username');
const dashRank = document.getElementById('dash-rank');
const btnStartGame = document.getElementById('btn-start-game');
const btnLogout = document.getElementById('btn-logout');
const btnBackLobby = document.getElementById('btn-back-lobby');
const btnDashConfig = document.getElementById('btn-dash-config');
const btnDashProfile = document.getElementById('btn-dash-profile');
const btnApplyRes = document.getElementById('btn-apply-res');
const gameRes = document.getElementById('gameRes');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authUsernameInput = document.getElementById('authUsername');
const authPasswordInput = document.getElementById('authPassword');
const btnAuthText = document.getElementById('btn-auth-text');
const authError = document.getElementById('auth-error');

const profUsername = document.getElementById('prof-username');
const profRank = document.getElementById('prof-rank');
const profId = document.getElementById('prof-id');
const profPassword = document.getElementById('prof-password');
const btnTogglePass = document.getElementById('btn-toggle-pass');
const profHighscore = document.getElementById('prof-highscore');
const profAvatarImg = document.getElementById('prof-avatar-img');
const navAvatarImg = document.getElementById('nav-avatar-img');
const profMatches = document.getElementById('prof-matches');
const profAvatarInput = document.getElementById('prof-avatar-input');
const btnUpdateAvatar = document.getElementById('btn-update-avatar');

const pauseSensInput = document.getElementById('pauseSens');
const btnApplySens = document.getElementById('btn-apply-sens');
const btnDayNightHud = document.getElementById('btn-day-night-hud');
const modesList = document.getElementById('modes-list');
const toastContainer = document.getElementById('toast-container');
const crosshair = document.getElementById('crosshair');
const scoreEl = document.getElementById('scoreVal');
const modeEl = document.getElementById('modeVal');

let usersDB = [];
let activeMode = 'login'; 

const loadDatabase = async () => {
  try {
    const data = localStorage.getItem('sevenTrackingDB');
    if (data) {
      usersDB = JSON.parse(data);
    } else {
      usersDB = [];
    }
  } catch(e) { console.error("Error loading DB", e); }
};

const saveDB = async (user) => {
  try {
    if (usersDB) {
      localStorage.setItem('sevenTrackingDB', JSON.stringify(usersDB));
    }
  } catch(e) { console.error("Error saving to DB", e); }
};

// --- LOAD/SAVE COMPARED TO OLD LOGIC ---
const saveDatabase = () => {
  const userIndex = usersDB.findIndex(u => u.username === state.playerName);
  if (userIndex > -1) {
    usersDB[userIndex].sens = state.sens;
    saveDB(usersDB[userIndex]);
  }
};

// --- NOVOS MODOS P&B (ALVOS LARANJAS COMO SOLICITADO) ---
const O_COLOR = 0xff8800; // Laranja (Vibrante) para facilitar a visualizacao contra BP

const MODES = [
  { name: 'MICROFLEX', color: O_COLOR, scale: 0.3, count: 1, type: 'micro', desc: 'Alvo pequeno com movimentações curtas e bruscas de recoil.' },
  { name: 'GRIDSHOT 3D', color: O_COLOR, scale: 0.8, count: 4, type: 'grid', desc: 'Vários alvos distribuídos. Destrua um para nascer outro.' },
  { name: 'TRACKING 360', color: O_COLOR, scale: 0.7, count: 1, type: 'orbit', desc: 'Pratique flicks longos mantendo a mira colada no alvo em rotação.' },
  { name: 'JUMPING BEAN', color: O_COLOR, scale: 0.7, count: 2, type: 'bounce', desc: 'Gravidade aplicada. Aprenda a rastrear alvos pulando no ar.' },
  { name: 'STRAFE TRACK', color: O_COLOR, scale: 0.6, count: 1, type: 'smooth_strafe', desc: 'Movimentações longas simulando um boneco strafando.' },
  { name: 'CHAOS SWARM', color: O_COLOR, scale: 0.4, count: 6, type: 'swarm', desc: 'Nuvem caótica de micro-alvos. Mantenha o foco em um de cada vez.' },
];

// Old selectors replaced by the block above

loadDatabase();

// --- SETUP THREE.JS (TEMA CLEAN P&B + DIA/NOITE CALIBRADO) ---
const container = document.getElementById('game-container');
const scene = new THREE.Scene();

// Calibragem exata do "Não tão claro" para o Dia, e um pouco mais claro que "Breu" pra noite.
const COLOR_NIGHT = 0x07070a; // Escuro Padrão FPS
const COLOR_DAY = 0x222228;   // "Um poquinho só mais claro" (Grau Acizentado, mas agradável)

scene.background = new THREE.Color(COLOR_NIGHT);
scene.fog = new THREE.FogExp2(COLOR_NIGHT, 0.012);

const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25); // Neutro o suficiente
scene.add(ambientLight);

const rimLight = new THREE.PointLight(0xffffff, 0.6, 150); 
rimLight.position.set(0, 40, -20);
scene.add(rimLight);

const floorMat = new THREE.MeshStandardMaterial({ 
  color: 0x111111,
  roughness: 0.8,
});
const floor = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 200), floorMat);
floor.position.set(0, -0.5, 0);
scene.add(floor);

// Grid Branca Suave
const gridHelper = new THREE.GridHelper(200, 40, 0x444444, 0x222222);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// --- ARMA 3D (GUN MODEL SETUP) ---
const gunGroup = new THREE.Group();
const gunMat = new THREE.MeshStandardMaterial({ 
  color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 
});
const gunMatAcc = new THREE.MeshStandardMaterial({ 
  color: 0x111111, roughness: 0.8 
});

// Cano / Corpo da Arma
const barrelGeo = new THREE.BoxGeometry(0.12, 0.15, 0.6);
const barrel = new THREE.Mesh(barrelGeo, gunMat);
barrel.position.set(0, 0, -0.3);

// Grip / Empunhadura
const gripGeo = new THREE.BoxGeometry(0.1, 0.3, 0.15);
const grip = new THREE.Mesh(gripGeo, gunMatAcc);
grip.position.set(0, -0.15, -0.1);
grip.rotation.x = Math.PI / 6;

// Mira RedDot simulada em cima
const sightGeo = new THREE.BoxGeometry(0.04, 0.04, 0.08);
const sightMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
const sight = new THREE.Mesh(sightGeo, sightMat);
sight.position.set(0, 0.09, -0.15);

gunGroup.add(barrel);
gunGroup.add(grip);
gunGroup.add(sight);

gunGroup.position.set(0.35, -0.35, -0.5);
camera.add(gunGroup); 
scene.add(camera); 
gunGroup.visible = false; 

// --- CONTROLES DA CÂMERA E MOUSE ---
const controls = new PointerLockControls(camera, renderer.domElement);
camera.position.set(0, 8, 0);

const applySensitivity = () => {
  if (controls && controls.isLocked) { /* wait for pointerlock */ }
  controls.pointerSpeed = Number(state.sens) * (Number(state.dpi) / 800) * 0.2; 
};

// --- FUNÇÃO DIA / NOITE (TEXTOS CLARIFICADOS) ---
const toggleDayNight = () => {
  state.isDay = !state.isDay;
  if (state.isDay) {
    scene.background.setHex(COLOR_DAY);
    scene.fog.color.setHex(COLOR_DAY);
    ambientLight.intensity = 0.45; // Apenas um *poquinho* mais claro pro dia
    floorMat.color.setHex(0x282830);
    gridHelper.material.color.setHex(0x555555);
    // Diz qual é o modo atual!
    btnDayNightHud.innerHTML = '<span class="icon">☀️</span> TEMA: DIA';
  } else {
    scene.background.setHex(COLOR_NIGHT);
    scene.fog.color.setHex(COLOR_NIGHT);
    ambientLight.intensity = 0.25; 
    floorMat.color.setHex(0x111111);
    gridHelper.material.color.setHex(0x222222);
    // Diz qual é o modo atual!
    btnDayNightHud.innerHTML = '<span class="icon">🌙</span> TEMA: NOITE';
  }
};
btnDayNightHud.addEventListener('click', () => {
  toggleDayNight();
  controls.lock();
});

const showToast = (message) => {
  const t = document.createElement('div');
  t.className = 'toast show';
  t.innerText = message;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// --- RANK CALCULATION ---
const getRank = (score) => {
  if (score < 500) return { name: 'INICIANTE', class: '' };
  if (score < 1000) return { name: 'FERRO', class: 'silver' };
  if (score < 2500) return { name: 'BRONZE', class: 'bronze' };
  if (score < 5000) return { name: 'PRATA', class: 'silver' };
  if (score < 8000) return { name: 'OURO', class: 'gold' };
  if (score < 12000) return { name: 'DIAMANTE', class: 'gold' };
  return { name: 'MESTRE', class: 'gold' };
};

// --- DYNAMIC DASHBOARD STATS ---
const statAccuracy = document.getElementById('stat-accuracy');
const statReaction = document.getElementById('stat-reaction');
const graphAccuracy = document.getElementById('graph-accuracy');
const graphReaction = document.getElementById('graph-reaction');

const generateGraphSVG = (color, reverse = false) => {
  let points = [];
  let y = reverse ? 40 : 10;
  for(let i=0; i<=5; i++) {
    points.push(`${i*40},${y}`);
    y += (Math.random() - 0.5) * 20;
    if(y < 5) y = 5;
    if(y > 45) y = 45;
  }
  return `<svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width: 100%; height: 100%;">
            <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>
          </svg>`;
};

const updateDashboardStats = (user) => {
  let acc = user.stats?.accuracy || 0;
  let rec = user.stats?.reaction || 0;
  
  statAccuracy.innerText = acc > 0 ? `${acc.toFixed(1)}%` : '0.0%';
  statReaction.innerText = rec > 0 ? `${rec.toFixed(0)}ms` : '---';
  
  graphAccuracy.innerHTML = generateGraphSVG('#20b2aa', true);
  graphReaction.innerHTML = generateGraphSVG('#f0e68c', false);
};

// --- LOGIC: LOGIN & DASHBOARD MOCK DB ---
const showDashboard = (user) => {
  state.playerName = user.username;
  state.dpi = user.dpi || 800;
  state.sens = user.sens || 0.20;
  
  playerNameDisplay.innerText = state.playerName.toUpperCase();
  dashUsername.innerText = state.playerName.toUpperCase();
  pauseSensInput.value = state.sens;
  
  // Profile Update
  profUsername.innerText = state.playerName.toUpperCase();
  profId.innerText = `#${user.id || '000000'}`;
  profPassword.value = user.password;
  profHighscore.innerText = user.high_score || 0;
  profMatches.innerText = user.matches || 0;
  
  if (user.customAvatar) {
    profAvatarImg.style.backgroundImage = `url('${user.customAvatar}')`;
    profAvatarImg.style.backgroundSize = 'cover';
    profAvatarImg.style.backgroundPosition = 'center';
    profAvatarImg.innerText = '';
    navAvatarImg.style.backgroundImage = `url('${user.customAvatar}')`;
    navAvatarImg.style.backgroundSize = 'cover';
    navAvatarImg.style.backgroundPosition = 'center';
    navAvatarImg.innerText = '';
  } else {
    profAvatarImg.style.backgroundImage = 'none';
    profAvatarImg.innerText = '👤';
    navAvatarImg.style.backgroundImage = 'none';
    navAvatarImg.innerText = '👤';
  }
  
  const rank = getRank(user.high_score || 0);
  profRank.innerText = rank.name;
  profRank.className = rank.class ? `rank-badge ${rank.class}` : `rank-badge`;
  
  // Update Topbar Rank
  const rankIcons = {
    'INICIANTE': '🌱', 'FERRO': '⚙️', 'BRONZE': '🥉', 
    'PRATA': '🥈', 'OURO': '🥇', 'DIAMANTE': '💎', 'MESTRE': '👑'
  };
  dashRank.innerText = `${rankIcons[rank.name] || ''} ${rank.name}`;
  dashRank.className = rank.class ? `user-rank ${rank.class}` : `user-rank`;

  applySensitivity();
  updateDashboardStats(user);
  
  authScreen.classList.remove('active');
  dashboardScreen.style.display = 'flex';
  switchDashPage('play'); // Default to play view on login
};

const logout = () => {
  dashboardScreen.style.display = 'none';
  authScreen.classList.add('active');
  authUsernameInput.value = '';
  authPasswordInput.value = '';
  authError.style.display = 'none';
  if (controls.isLocked) controls.unlock();
};

const handleAuthError = (msg) => {
  authError.innerText = msg;
  authError.style.display = 'block';
  setTimeout(() => authError.style.display = 'none', 3000);
};

tabLogin.addEventListener('click', () => {
  activeMode = 'login';
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  btnAuthText.innerText = 'ENTRAR';
  registerFields.style.opacity = '0';
  registerFields.style.height = '0';
  setTimeout(() => registerFields.style.display = 'none', 300);
});

tabRegister.addEventListener('click', () => {
  activeMode = 'register';
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  btnAuthText.innerText = 'CRIAR CONTA';
  registerFields.style.display = 'block';
  setTimeout(() => {
    registerFields.style.opacity = '1';
    registerFields.style.height = '75px';
  }, 10);
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btnOriginalText = btnAuthText.innerText;
  btnAuthText.innerText = 'CARREGANDO...';
  btnAuthText.parentElement.style.opacity = '0.7';

  if (usersDB.length === 0) await loadDatabase();

  const user = authUsernameInput.value.trim();
  const pass = authPasswordInput.value.trim();

  if(!user || !pass) {
    btnAuthText.innerText = btnOriginalText;
    btnAuthText.parentElement.style.opacity = '1';
    return handleAuthError("Preencha todos os campos");
  }

  const existing = usersDB.find(u => u.username === user);

  if (activeMode === 'register') {
    if (existing) {
      btnAuthText.innerText = btnOriginalText;
      btnAuthText.parentElement.style.opacity = '1';
      return handleAuthError("Usuário já existe. Tente logar.");
    }
    const newId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newUser = { 
      id: newId,
      username: user, 
      password: pass, 
      dpi: authDPIInput.value ? Number(authDPIInput.value) : 800, 
      sens: authSensInput.value ? Number(authSensInput.value) : 0.20,
      high_score: 0,
      matches: 0,
      stats: { accuracy: 0, reaction: 0 },
      customAvatar: ''
    };
    usersDB.push(newUser);
    await saveDB(newUser);
    showToast(`Conta criada: ${user}`);
    showDashboard(newUser);
  } else {
    // Login
    if (!existing) {
      btnAuthText.innerText = btnOriginalText;
      btnAuthText.parentElement.style.opacity = '1';
      return handleAuthError("Usuário não encontrado.");
    }
    if (existing.password !== pass) {
      btnAuthText.innerText = btnOriginalText;
      btnAuthText.parentElement.style.opacity = '1';
      return handleAuthError("Senha incorreta.");
    }
    showToast(`Bem-vindo, ${user}`);
    showDashboard(existing);
  }
  
  btnAuthText.innerText = btnOriginalText;
  btnAuthText.parentElement.style.opacity = '1';
});

btnLogout.addEventListener('click', logout);

btnStartGame.addEventListener('click', () => {
  dashboardScreen.style.display = 'none';
  if (!controls.isLocked) controls.lock();
});

btnApplySens.addEventListener('click', () => {
  state.sens = pauseSensInput.value;
  saveDatabase();
  applySensitivity();
  showToast("Nova sensi salva");
  controls.lock(); 
});

const renderModesMenu = () => {
  modesList.innerHTML = '';
  MODES.forEach((m, idx) => {
    const isCurrent = state.mode === idx;
    const card = document.createElement('div');
    card.className = `mode-card ${isCurrent ? 'active' : ''}`;
    // Usar bordas Laranjas
    card.style.borderLeftColor = isCurrent ? '#ff8800' : '#888';
    card.innerHTML = `
      <div class="mode-card-title">${m.name}</div>
      <div class="mode-card-desc">${m.desc}</div>
    `;
    card.addEventListener('click', () => {
      state.mode = idx;
      renderModesMenu();
      setupMode();
      // Toast notice removed based on request
    });
    modesList.appendChild(card);
  });
};
renderModesMenu();

// --- NEW LISTENERS FOR LOBBY CONFIG & PROFILE ---
btnBackLobby.addEventListener('click', () => {
  pauseOverlay.classList.remove('active');
  dashboardScreen.style.display = 'flex';
  showToast("Retornado ao Lobby");
});

const switchDashPage = (pageName) => {
  dashGridPlay.style.display = 'none';
  dashPageProfile.style.display = 'none';
  dashPageConfig.style.display = 'none';
  btnDashPlay.classList.remove('active');
  btnDashProfile.classList.remove('active');
  btnDashConfig.classList.remove('active');
  
  if(pageName === 'play') {
    dashGridPlay.style.display = 'grid';
    btnDashPlay.classList.add('active');
    dashPageTitle.innerText = 'MÓDULO DE TREINO';
  } else if(pageName === 'profile') {
    dashPageProfile.style.display = 'flex';
    btnDashProfile.classList.add('active');
    dashPageTitle.innerText = 'SEU PERFIL';
  } else if(pageName === 'config') {
    dashPageConfig.style.display = 'flex';
    btnDashConfig.classList.add('active');
    dashPageTitle.innerText = 'CONFIGURAÇÕES GERAIS';
  }
};

btnDashPlay.addEventListener('click', () => switchDashPage('play'));
btnDashProfile.addEventListener('click', () => switchDashPage('profile'));
btnDashConfig.addEventListener('click', () => switchDashPage('config'));

btnTogglePass.addEventListener('click', () => {
  if (profPassword.type === 'password') {
    profPassword.type = 'text';
    btnTogglePass.innerText = '🙈';
  } else {
    profPassword.type = 'password';
    btnTogglePass.innerText = '👁️';
  }
});

btnUpdateAvatar.addEventListener('click', () => {
  const url = profAvatarInput.value.trim();
  const currentUser = usersDB.find(u => u.username === state.playerName);
  if (currentUser) {
    currentUser.customAvatar = url;
    saveDB(currentUser);
    
    if (url) {
      profAvatarImg.style.backgroundImage = `url('${url}')`;
      profAvatarImg.style.backgroundSize = 'cover';
      profAvatarImg.style.backgroundPosition = 'center';
      profAvatarImg.innerText = '';
      navAvatarImg.style.backgroundImage = `url('${url}')`;
      navAvatarImg.style.backgroundSize = 'cover';
      navAvatarImg.style.backgroundPosition = 'center';
      navAvatarImg.innerText = '';
    } else {
      profAvatarImg.style.backgroundImage = 'none';
      profAvatarImg.innerText = '👤';
      navAvatarImg.style.backgroundImage = 'none';
      navAvatarImg.innerText = '👤';
    }
    showToast("Foto Atualizada com Sucesso!");
    profAvatarInput.value = '';
  }
});

btnApplyRes.addEventListener('click', () => {
  const res = gameRes.value;
  if (res === 'auto') {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
  } else {
    const [w, h] = res.split('x').map(Number);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // Centralizar tela menor
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    renderer.domElement.style.margin = 'auto';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.bottom = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.right = '0';
  }
  camera.updateProjectionMatrix();
  showToast("Resolução Atualizada");
});

let sessionFrames = 0;
let sessionHits = 0;

// --- EVENTOS DE LOCK / UNLOCK ---
controls.addEventListener('lock', () => {
  state.isPlaying = true;
  authScreen.classList.remove('active');
  dashboardScreen.style.display = 'none';
  pauseOverlay.classList.remove('active');
  hud.style.display = 'block';

  sessionFrames = 0;
  sessionHits = 0;

  if (targets.length === 0) setupMode();
});

controls.addEventListener('unlock', () => {
  state.isPlaying = false;
  hud.style.display = 'none';
  
  if (!authScreen.classList.contains('active') && dashboardScreen.style.display === 'none') {
    pauseOverlay.classList.add('active');
    pauseSensInput.value = state.sens; 

    // CALCULATE AND SAVE STATS
    if (sessionFrames > 10) {
      const currentUser = usersDB.find(u => u.username === state.playerName);
      if (currentUser) {
        let acc = (sessionHits / sessionFrames) * 100;
        let lastAcc = currentUser.stats?.accuracy || 0;
        let newAcc = lastAcc === 0 ? acc : (lastAcc * 0.8 + acc * 0.2);
        
        // Simulação do Reaction baseado no acc tracking 
        let reaction = Math.max(120, 320 - (acc * 2.5));
        let lastReaction = currentUser.stats?.reaction || 0;
        let newReaction = lastReaction === 0 ? reaction : (lastReaction * 0.8 + reaction * 0.2);

        currentUser.stats = { accuracy: newAcc, reaction: newReaction };
        currentUser.matches = (currentUser.matches || 0) + 1;
        saveDB(currentUser);
        updateDashboardStats(currentUser);
        profMatches.innerText = currentUser.matches;
      }
    }
  }
});

document.addEventListener('click', (e) => {
  if (!controls.isLocked && !authScreen.classList.contains('active') && dashboardScreen.style.display === 'none') {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && !e.target.closest('.mode-card') && !e.target.closest('.btn-hud')) {
       // controls.lock(); // Desativado pra n roubar o click em menus
    }
  }
});

// --- LÓGICA DE ALVOS (AGORA EM LARANJA) ---
let targets = [];
const targetGeo = new THREE.IcosahedronGeometry(2, 2); 

const spawnTarget = (modeData, isRespawn = false) => {
  const mat = new THREE.MeshPhongMaterial({
    color: modeData.color, // Laranja
    emissive: modeData.color,
    emissiveIntensity: 0.6,
    shininess: 100,
  });
  const mesh = new THREE.Mesh(targetGeo, mat);
  mesh.scale.set(modeData.scale, modeData.scale, modeData.scale);
  
  let startX = (Math.random() - 0.5) * 60;
  let startY = 10 + Math.random() * 20;
  let startZ = -40;

  if (modeData.type === 'orbit') {
    startX = 30;
    startZ = 0;
  }

  mesh.position.set(startX, startY, startZ);

  mesh.userData = {
    type: modeData.type,
    time: Math.random() * 100,
    velX: (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 10),
    velY: (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 10),
    baseY: startY,
    angle: 0
  };

  scene.add(mesh);
  targets.push(mesh);
  rimLight.color.setHex(0xffffff); // Somente reflete de trás
};

const setupMode = () => {
  targets.forEach(t => scene.remove(t));
  targets = [];
  const m = MODES[state.mode];
  
  modeEl.innerText = m.name;
  
  for(let i=0; i<m.count; i++) spawnTarget(m);

  state.score = 0;
  scoreEl.innerText = state.score;
};

// --- ANIMAÇÕES CADA FRAME ---
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0); 
let hitTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  hitTimer -= delta;

  // Animar Arma levemente
  if (gunGroup.visible) {
    gunGroup.position.y = -0.35 + Math.sin(time * 2) * 0.005;
    gunGroup.rotation.z = Math.cos(time * 1.5) * 0.005;
  }

  if (state.isPlaying) {
    sessionFrames++;
    
    targets.forEach((t, i) => {
      const u = t.userData;
      u.time += delta;
      
      switch(u.type) {
        case 'micro':
          t.position.x += Math.sin(u.time * 60) * delta * 6; 
          t.position.y += Math.cos(u.time * 45) * delta * 6;
          if(Math.random() < 0.015) { 
            t.position.x += (Math.random() - 0.5) * 20;
            t.position.y += (Math.random() - 0.5) * 10;
          }
          break;
          
        case 'grid': 
          break;
          
        case 'orbit': 
          u.angle += delta * 1.3;
          t.position.x = Math.sin(u.angle) * 35; 
          t.position.z = Math.cos(u.angle) * 35; 
          t.position.y = u.baseY + Math.sin(u.time * 2) * 4; 
          break;

        case 'bounce': 
          u.velY -= 32 * delta; 
          t.position.y += u.velY * delta;
          t.position.x += u.velX * delta;
          if(t.position.y <= 2) { 
            t.position.y = 2;
            u.velY = 25 + Math.random() * 12; 
          }
          break;

        case 'smooth_strafe': 
          let targetSpeed = u.velX > 0 ? 30 : -30;
          if(Math.random() < 0.015) u.velX *= -1;
          t.position.x += u.velX * delta;
          break;

        case 'swarm':
          t.position.x += Math.sin(u.time + i) * delta * 35;
          t.position.y += Math.cos(u.time * 1.5 + i) * delta * 25;
          break;
      }

      if(u.type !== 'orbit') {
        if (t.position.x > 50) { t.position.x = 50; u.velX *= -1; }
        if (t.position.x < -50) { t.position.x = -50; u.velX *= -1; }
        if (t.position.y > 40) { t.position.y = 40; u.velY *= -1; }
        if (u.type !== 'bounce' && t.position.y < 2) { t.position.y = 2; u.velY *= -1; }
      }
    });

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(targets);
    
    if (intersects.length > 0) {
      sessionHits++;
      if(hitTimer <= 0) { 
        state.score += 10;
        scoreEl.innerText = state.score;
        hitTimer = 0.05;

        // HIGH SCORE LOGIC
        const currentUser = usersDB.find(u => u.username === state.playerName);
        if (currentUser && state.score > (currentUser.high_score || 0)) {
          currentUser.high_score = state.score;
          saveDB(currentUser);
        }

        // Efeito de tiro na arma 3D
        if (gunGroup.visible) {
          gunGroup.position.z = -0.45; // Coice
        }
      }
      crosshair.classList.add('crosshair-active');
      const hitObj = intersects[0].object;
      hitObj.material.emissiveIntensity = 1.0;
      hitObj.scale.set(hitObj.scale.x * 0.95, hitObj.scale.y * 0.95, hitObj.scale.z * 0.95);

      const m = MODES[state.mode];
      if(m.type === 'grid' || hitObj.scale.x < (m.scale * 0.3)) {
        scene.remove(hitObj);
        targets = targets.filter(t => t !== hitObj);
        spawnTarget(m, true);
      }
    } else {
      crosshair.classList.remove('crosshair-active');
      targets.forEach(t => {
        t.material.emissiveIntensity = 0.5;
        const scaleBase = MODES[state.mode].scale;
        if(t.scale.x < scaleBase) {
           t.scale.addScalar(delta * 0.5);
        }
      });
    }

    if (gunGroup.visible) {
      gunGroup.position.z += ( -0.5 - gunGroup.position.z ) * delta * 10;
    }
  }

  renderer.render(scene, camera);
}

// Borda hotkeys (U, L, H)
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || authScreen.classList.contains('active') || dashboardScreen.style.display !== 'none') return;
  const k = e.key.toLowerCase();
  
  if (k === 'u') {
    if (controls.isLocked) {
      controls.unlock();
    } else {
      if(pauseOverlay.classList.contains('active')) controls.lock();
      else pauseOverlay.classList.add('active');
    }
  }

  if (k === 'l') {
    toggleDayNight();
  }

  // BOTÃO DA ARMA (H)
  if (k === 'h') {
    state.hasGunAttached = !state.hasGunAttached;
    gunGroup.visible = state.hasGunAttached;
    showToast(state.hasGunAttached ? "Arma 3D Equipada" : "Arma Oculta");
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
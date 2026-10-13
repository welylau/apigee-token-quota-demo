/**
 * Apigee LLM Token Quota & AI Governance Demo
 * Interactive Frontend Controller with Real-Time Meter Animation & Coffee Shop UI Theme
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- App State ---
  let appConfig = null;
  let selectedApp = 'Gemini-Basic-Mfg-SmartTV-App';
  let activeDuration = '1h';
  let charts = {};
  let isExecuting = false;
  let lastAnalyticsData = null;

  // --- Scenario Presets (display-only relabeling of Apigee entities) ---
  const SP = window.ScenarioPresets;
  let scenario = SP.loadActive();
  let presets = { ...scenario.prompts };
  const GOLD_SHOWCASE_APP = 'Gemini-Premium-Network-Core-App';

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function normTier(tier) { return tier === 'Gold' ? 'Gold' : 'Silver'; }
  function tierOfApp(appName, fallbackTier) { return SP.APP_TIERS[appName] || normTier(fallbackTier); }
  function productLabel(tier) { return scenario.products[normTier(tier)].label; }
  function productIcon(tier) { return scenario.products[normTier(tier)].icon; }
  function appMeta(appName) { return scenario.apps[appName] || null; }
  function appLabel(appName, fallback) { const m = appMeta(appName); return m ? m.name : (fallback || appName); }
  function appIcon(appName, tier) { const m = appMeta(appName); return m ? m.icon : (normTier(tier) === 'Gold' ? '👑' : '📺'); }
  function appAttr(appName, key, fallback) { const m = appMeta(appName); return m ? m[key] : (fallback || ''); }
  function appDesc(appName, fallback) { const m = appMeta(appName); return m ? m.description : (fallback || ''); }
  function attrLabel(key) { return scenario.attrLabels[key]; }

  // --- DOM Elements ---
  const adminDrawer = document.getElementById('adminDrawer');
  const adminDrawerBackdrop = document.getElementById('adminDrawerBackdrop');
  const btnOpenAdminDrawer = document.getElementById('btnOpenAdminDrawer');
  const floatingAdminTrigger = document.getElementById('floatingAdminTrigger');
  const btnCloseAdminDrawer = document.getElementById('btnCloseAdminDrawer');

  // App-Specific Admin Drawer Elements
  let selectedAppSpecific = 'Gemini-Basic-Mfg-SmartTV-App';
  let activeAppDuration = '1h';
  let appCharts = {};

  const appAdminDrawer = document.getElementById('appAdminDrawer');
  const btnOpenAppAdminDrawer = document.getElementById('btnOpenAppAdminDrawer');
  const floatingAppAdminTrigger = document.getElementById('floatingAppAdminTrigger');
  const btnCloseAppAdminDrawer = document.getElementById('btnCloseAppAdminDrawer');
  const appSpecificSelector = document.getElementById('appSpecificSelector');
  const refreshAppAnalyticsBtn = document.getElementById('refresh-app-analytics-btn');
  const appsGrid = document.getElementById('apps-grid');
  const promptInput = document.getElementById('prompt-input');
  const promptCharCount = document.getElementById('prompt-char-count');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const sendSingleBtn = document.getElementById('send-single-btn');
  const simulateBurstBtn = document.getElementById('simulate-burst-btn');
  const burstCountSelect = document.getElementById('burst-count');

  // Response Elements
  const responseEmptyState = document.getElementById('response-empty-state');
  const responseContent = document.getElementById('response-content');
  const responseText = document.getElementById('response-text');
  const responseLatencyPill = document.getElementById('response-latency-pill');
  const responseLatency = document.getElementById('response-latency');
  const tokenChipsGrid = document.getElementById('token-chips-grid');
  const chipPromptTokens = document.getElementById('chip-prompt-tokens');
  const chipCandidatesTokens = document.getElementById('chip-candidates-tokens');
  const chipTotalTokens = document.getElementById('chip-total-tokens');
  const chipHttpStatus = document.getElementById('chip-http-status');
  const quotaExceededAlert = document.getElementById('quota-exceeded-alert');
  const quotaAlertMessage = document.getElementById('quota-alert-message');
  const quickSwitchGoldBtn = document.getElementById('quick-switch-gold-btn');
  const burstStepsContainer = document.getElementById('burst-steps-container');
  const burstStepsList = document.getElementById('burst-steps-list');

  // Meter Elements
  const meterTierTag = document.getElementById('meter-tier-tag');
  const meterAppName = document.getElementById('meter-app-name');
  const meterDeptBadge = document.getElementById('meter-dept-badge');
  const meterAppDesc = document.getElementById('meter-app-desc');
  const meterStatusPill = document.getElementById('meter-status-pill');
  const meterStatusText = document.getElementById('meter-status-text');
  const meterProgressFill = document.getElementById('meter-progress-fill');
  const meterTokensUsed = document.getElementById('meter-tokens-used');
  const meterQuotaLimit = document.getElementById('meter-quota-limit');
  const meterPercentage = document.getElementById('meter-percentage');
  const meterTokensRemaining = document.getElementById('meter-tokens-remaining');

  // Analytics Elements
  const durationButtons = document.querySelectorAll('#adminDrawer .duration-btn');
  const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
  const resetLedgerBtn = document.getElementById('reset-ledger-btn');
  const txSearchInput = document.getElementById('tx-search-input');
  const txTableBody = document.getElementById('tx-table-body');

  // Theme & Modal Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const archInfoBtn = document.getElementById('archInfoBtn');
  const viewArchBtn = document.getElementById('viewArchBtn');
  const archModal = document.getElementById('archModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // --- Initialize ---
  init();

  async function init() {
    initTheme();
    initSplitter();
    setupArchModal();
    setupAdminDrawer();
    setupAppAdminDrawer();
    setupPromptPresets();
    setupActionHandlers();
    setupAnalyticsControls();
    setupScenarioSettings();
    applyScenarioStatic();
    
    // Default prompt
    promptInput.value = presets.medium;
    updateCharCount();

    // Initial load
    await loadConfig();
    exposeTourApi();
    await loadAnalytics();
  }

  /**
   * Minimal API for the Guided Tour (static/tour/tour-engine.js).
   * Lets the tour pick a profile, load a prompt preset and set the burst size.
   */
  function exposeTourApi() {
    const isExhausted = (app) => {
      const r = app.rollingUsage || {};
      return !!(r.isExhausted || r.status === 'EXHAUSTED' || (r.usedTokens || 0) >= (app.quotaLimit || Infinity));
    };
    window.quotaApp = {
      /** Selects a profile of the given tier ('Silver' | 'Gold'), preferring one with budget left. */
      selectTier(tier) {
        const apps = (appConfig && appConfig.apps) || [];
        const ofTier = apps.filter(a => tierOfApp(a.name, a.tier) === tier);
        if (tier === 'Gold') ofTier.sort((a, b) => (b.name === GOLD_SHOWCASE_APP) - (a.name === GOLD_SHOWCASE_APP));
        const fresh = ofTier.filter(a => !isExhausted(a));
        const keep = fresh.find(a => a.name === selectedApp);
        const pick = keep || fresh[0] || ofTier.find(a => a.name === selectedApp) || ofTier[0];
        if (pick) switchApp(pick.name);
        return pick ? pick.name : selectedApp;
      },
      selectedApp: () => selectedApp,
      setPreset(key) {
        const btn = document.querySelector(`.preset-btn[data-preset="${key}"]`);
        if (btn) btn.click();
      },
      setBurst(n) {
        if (burstCountSelect && burstCountSelect.querySelector(`option[value="${n}"]`)) burstCountSelect.value = String(n);
      },
      appLabel: (name) => appLabel(name),
      productLabel: (tier) => productLabel(tier),
      tierOf: (name) => tierOfApp(name),
      isRunning: () => isExecuting,
    };
    window.dispatchEvent(new CustomEvent('quota:ready'));
  }

  // --- Horizontal Splitter Resizing Controller ---
  function initSplitter() {
    const splitter = document.getElementById('panel-splitter');
    const leftPanel = document.getElementById('simulator-left-panel');
    const layout = document.querySelector('.simulator-layout');
    if (!splitter || !leftPanel || !layout) return;

    const STORAGE_KEY = 'apigee_simulator_left_panel_width';
    const DEFAULT_WIDTH = 320;
    const MIN_WIDTH = 260;

    // Load saved width
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth && window.innerWidth > 992) {
      const parsed = parseInt(savedWidth, 10);
      const maxWidth = Math.min(650, Math.floor(window.innerWidth * 0.55));
      if (parsed >= MIN_WIDTH && parsed <= maxWidth) {
        leftPanel.style.width = `${parsed}px`;
      }
    }

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseDown = (e) => {
      if (e.button !== 0) return; // only left click
      startDrag(e.clientX);
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX);
      }
    };

    const startDrag = (clientX) => {
      isDragging = true;
      startX = clientX;
      startWidth = leftPanel.getBoundingClientRect().width;
      splitter.classList.add('active');
      document.body.classList.add('is-resizing');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    const handleMove = (currentX) => {
      const delta = currentX - startX;
      let newWidth = startWidth + delta;
      const maxWidth = Math.min(650, Math.floor(window.innerWidth * 0.55));

      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
      if (newWidth > maxWidth) newWidth = maxWidth;

      leftPanel.style.width = `${newWidth}px`;
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      splitter.classList.remove('active');
      document.body.classList.remove('is-resizing');

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);

      const finalWidth = parseInt(leftPanel.style.width, 10);
      if (finalWidth) {
        localStorage.setItem(STORAGE_KEY, finalWidth);
      }
    };

    const onMouseUp = () => endDrag();
    const onTouchEnd = () => endDrag();

    splitter.addEventListener('mousedown', onMouseDown);
    splitter.addEventListener('touchstart', onTouchStart, { passive: true });

    // Double-click to reset to default
    splitter.addEventListener('dblclick', () => {
      leftPanel.style.width = `${DEFAULT_WIDTH}px`;
      localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH);
    });

    // Keyboard support (Left / Right arrow keys)
    splitter.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const currentWidth = leftPanel.getBoundingClientRect().width;
        const step = e.shiftKey ? 30 : 15;
        const delta = e.key === 'ArrowLeft' ? -step : step;
        let newWidth = currentWidth + delta;
        const maxWidth = Math.min(650, Math.floor(window.innerWidth * 0.55));
        if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
        if (newWidth > maxWidth) newWidth = maxWidth;
        leftPanel.style.width = `${newWidth}px`;
        localStorage.setItem(STORAGE_KEY, Math.round(newWidth));
      } else if (e.key === 'Home' || e.key === 'Escape') {
        leftPanel.style.width = `${DEFAULT_WIDTH}px`;
        localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH);
      }
    });

    // Reset inline width on window resize if under breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 992) {
        leftPanel.style.width = '';
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          leftPanel.style.width = `${saved}px`;
        }
      }
    });
  }

  // --- Theme Toggle Logic ---
  function initTheme() {
    const savedTheme = localStorage.getItem('apigee_theme') || 'light';
    applyTheme(savedTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem('apigee_theme', next);

        if (lastAnalyticsData) {
          renderCharts(lastAnalyticsData);
        }
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIconSun && themeIconMoon) {
      if (theme === 'dark') {
        themeIconSun.style.display = 'none';
        themeIconMoon.style.display = 'block';
      } else {
        themeIconSun.style.display = 'block';
        themeIconMoon.style.display = 'none';
      }
    }
  }

  // --- Architecture Modal Logic ---
  function setupArchModal() {
    const openModal = () => {
      if (archModal) {
        archModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    };

    const closeModal = () => {
      if (archModal) {
        archModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    };

    if (viewArchBtn) {
      viewArchBtn.addEventListener('click', openModal);
    }
    if (archInfoBtn) {
      archInfoBtn.addEventListener('click', openModal);
    }
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
    }
    if (archModal) {
      archModal.addEventListener('click', (e) => {
        if (e.target === archModal) {
          closeModal();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && archModal && archModal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  // --- Admin Analytics Collapsible Drawer (with Aggregated & App-Specific tabs) ---
  let activeAdminTab = 'aggregated';

  function switchAdminTab(tabName) {
    activeAdminTab = tabName === 'app-specific' ? 'app-specific' : 'aggregated';
    const aggPane = document.getElementById('adminDrawerContent');
    const appPane = document.getElementById('appAdminDrawerContent');
    const tabBtns = document.querySelectorAll('.admin-tab-btn');

    tabBtns.forEach(btn => {
      const isMatch = btn.dataset.adminTab === activeAdminTab;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    if (activeAdminTab === 'app-specific') {
      if (aggPane) aggPane.style.display = 'none';
      if (appPane) appPane.style.display = '';
      setTimeout(() => {
        loadAppSpecificAnalytics();
      }, 30);
      setTimeout(() => {
        Object.values(appCharts).forEach(c => {
          if (c && typeof c.resize === 'function') c.resize();
        });
      }, 200);
    } else {
      if (aggPane) aggPane.style.display = '';
      if (appPane) appPane.style.display = 'none';
      setTimeout(() => {
        loadAnalytics();
      }, 30);
      setTimeout(() => {
        Object.values(charts).forEach(c => {
          if (c && typeof c.resize === 'function') c.resize();
        });
      }, 200);
    }
  }

  function setupAdminDrawer() {
    function openAdminDrawer() {
      if (adminDrawer) adminDrawer.classList.add('open');
      if (adminDrawerBackdrop) adminDrawerBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
      switchAdminTab(activeAdminTab);
    }

    function closeAdminDrawer() {
      if (adminDrawer) adminDrawer.classList.remove('open');
      if (adminDrawerBackdrop) adminDrawerBackdrop.classList.remove('active');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchAdminTab(btn.dataset.adminTab);
      });
    });

    if (btnOpenAdminDrawer) {
      btnOpenAdminDrawer.addEventListener('click', openAdminDrawer);
    }
    if (floatingAdminTrigger) {
      floatingAdminTrigger.addEventListener('click', openAdminDrawer);
    }
    if (btnCloseAdminDrawer) {
      btnCloseAdminDrawer.addEventListener('click', closeAdminDrawer);
    }
    if (adminDrawerBackdrop) {
      adminDrawerBackdrop.addEventListener('click', () => {
        closeAdminDrawer();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && adminDrawer && adminDrawer.classList.contains('open')) {
        closeAdminDrawer();
      }
    });
  }

  // --- Prompt Presets ---
  function setupPromptPresets() {
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const presetKey = btn.dataset.preset;
        if (presets[presetKey]) {
          promptInput.value = presets[presetKey];
          updateCharCount();
        }
      });
    });

    promptInput.addEventListener('input', updateCharCount);
  }

  function updateCharCount() {
    promptCharCount.textContent = `${promptInput.value.length} chars (~${Math.round(promptInput.value.length / 4)} tokens)`;
  }

  // --- Load Config & Render Apps Grid ---
  async function loadConfig() {
    try {
      const res = await fetch(`/api/config?_t=${Date.now()}`, { cache: 'no-store' });
      appConfig = await res.json();

      const headerOrgEl = document.getElementById('header-org');
      const headerEnvEl = document.getElementById('header-env');
      if (headerOrgEl) headerOrgEl.textContent = appConfig.org;
      if (headerEnvEl) headerEnvEl.textContent = appConfig.env;
      if (document.getElementById('header-model') && appConfig.targetModel) {
        document.getElementById('header-model').textContent = appConfig.targetModel;
      }

      renderAppsGrid(appConfig.apps);
      updateMeterForSelectedApp();
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  function renderAppsGrid(apps) {
    appsGrid.innerHTML = '';
    apps.forEach(app => {
      const isSelected = app.name === selectedApp;
      const isGold = app.tier === 'Gold';
      const rolling = app.rollingUsage || { usedTokens: 0, isExhausted: false };

      const card = document.createElement('div');
      card.className = `app-card ${isSelected ? 'selected' : ''} ${rolling.isExhausted ? 'exhausted' : ''}`;
      card.dataset.appName = app.name;
      card.title = `${appLabel(app.name, app.displayName)} (${appAttr(app.name, 'attr1', app.department)} / ${appAttr(app.name, 'attr2', app.subDepartment)}) • ${app.quotaLimit >= 1000 ? (app.quotaLimit / 1000) + 'K' : app.quotaLimit} tokens per ${app.quotaWindowMinutes || 5} minutes\nApigee app: ${app.name} • Product: ${app.product}`;

      card.innerHTML = `
        <div class="app-card-icon-wrap ${isGold ? 'gold' : 'silver'}">
          ${escapeHtml(appIcon(app.name, app.tier))}
        </div>
        <div class="app-card-body">
          <div class="app-card-main-row">
            <span class="app-card-name">${escapeHtml(appLabel(app.name, app.displayName))}</span>
            <span class="tier-pill ${isGold ? 'gold' : 'silver'}">${escapeHtml(productLabel(app.tier))}</span>
          </div>
          <div class="app-card-sub-row">
            <span class="app-card-rate">${app.quotaLimit >= 1000 ? (app.quotaLimit / 1000) + 'K' : app.quotaLimit} per ${app.quotaWindowMinutes || 5} minutes</span>
            <span class="app-card-used" data-app-used="${app.name}">${rolling.usedTokens.toLocaleString()} used</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        switchApp(app.name);
      });

      appsGrid.appendChild(card);
    });
  }

  function switchApp(appName) {
    selectedApp = appName;
    document.querySelectorAll('.app-card').forEach(c => {
      if (c.dataset.appName === appName) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });
    updateMeterForSelectedApp();
  }

  function updateMeterForSelectedApp() {
    if (!appConfig || !appConfig.apps) return;
    const app = appConfig.apps.find(a => a.name === selectedApp);
    if (!app) return;

    updateMeterDirectly(selectedApp, app.rollingUsage, app);
  }

  /**
   * DIRECT REAL-TIME METER UPDATE
   * Immediately updates DOM and animates the progress bar without waiting for re-fetch.
   */
  function updateMeterDirectly(appName, rollingUsage, appInfo = null) {
    if (!rollingUsage) return;

    if (!appInfo && appConfig && appConfig.apps) {
      appInfo = appConfig.apps.find(a => a.name === appName);
    }
    
    // Fallback default info if appInfo not yet resolved
    const isGold = appInfo ? (appInfo.tier === 'Gold') : (appName && appName.includes('Premium'));
    const limit = (appInfo && appInfo.quotaLimit) ? appInfo.quotaLimit : (rollingUsage.quotaLimit || (isGold ? 40000 : 4000));
    const tierName = productLabel(isGold ? 'Gold' : 'Silver');
    const deptText = `${appAttr(appName, 'attr1', appInfo && appInfo.department)} / ${appAttr(appName, 'attr2', appInfo && appInfo.subDepartment)}`;
    const descText = `${appDesc(appName, appInfo && appInfo.description)} • Quota: ${limit.toLocaleString()} tokens / 5 mins`;

    // Cache updated rolling usage in appConfig
    if (appInfo) {
      appInfo.rollingUsage = rollingUsage;
    }

    // Update app card in left panel grid immediately
    const usedEl = document.querySelector(`[data-app-used="${appName}"]`);
    if (usedEl) {
      usedEl.textContent = `${(rollingUsage.usedTokens || 0).toLocaleString()} used`;
    }
    const cardEl = document.querySelector(`.app-card[data-app-name="${appName}"]`);
    if (cardEl) {
      const isExhaustedApp = rollingUsage.isExhausted || (rollingUsage.status === 'EXHAUSTED') || ((rollingUsage.usedTokens || 0) >= limit);
      if (isExhaustedApp) {
        cardEl.classList.add('exhausted');
      } else {
        cardEl.classList.remove('exhausted');
      }
    }

    // Only update main meter banner if this is the currently selected app
    if (appName !== selectedApp) return;

    // Remove any evaluating pulse states
    setMeterEvaluatingState(false);

    meterTierTag.className = `tier-tag ${isGold ? 'gold' : 'silver'}`;
    meterTierTag.textContent = `${productIcon(isGold ? 'Gold' : 'Silver')} ${tierName}`;
    meterAppName.textContent = appLabel(appName);
    meterAppName.title = `Apigee Developer App: ${appName}`;
    meterDeptBadge.textContent = deptText;
    meterAppDesc.textContent = descText;

    const used = rollingUsage.usedTokens || 0;
    const isExhausted = rollingUsage.isExhausted || (rollingUsage.status === 'EXHAUSTED') || (used >= limit);
    const pct = isExhausted ? 100.0 : Math.min(100.0, Math.round((used / limit) * 1000) / 10);
    const remaining = isExhausted ? 0 : Math.max(0, limit - used);

    // Dynamic number counters
    meterTokensUsed.textContent = used.toLocaleString();
    meterQuotaLimit.textContent = limit.toLocaleString();
    meterPercentage.textContent = `(${pct.toFixed(1)}%)`;
    meterTokensRemaining.textContent = isExhausted ? '0 (Exceeded)' : remaining.toLocaleString();

    // Visual Progress Bar Animation
    meterProgressFill.style.width = `${pct}%`;
    meterProgressFill.className = 'progress-bar-fill';
    if (isExhausted || pct >= 85) {
      meterProgressFill.classList.add('danger');
    } else if (pct >= 60) {
      meterProgressFill.classList.add('warning');
    }

    // Status Pill
    if (isExhausted) {
      meterStatusPill.className = 'meter-status-pill exhausted';
      meterStatusText.textContent = 'Quota Exhausted (HTTP 429)';
    } else {
      meterStatusPill.className = 'meter-status-pill active';
      meterStatusText.textContent = 'Active (Quota Available)';
    }
  }

  function setMeterEvaluatingState(evaluating) {
    const track = document.querySelector('.progress-bar-track');
    if (evaluating) {
      meterStatusPill.className = 'meter-status-pill evaluating';
      meterStatusText.textContent = 'Evaluating Quota...';
      meterProgressFill.classList.add('evaluating');
      if (track) track.classList.add('evaluating');
    } else {
      meterProgressFill.classList.remove('evaluating');
      if (track) track.classList.remove('evaluating');
    }
  }

  async function loadConfigSilently() {
    try {
      const res = await fetch(`/api/config?_t=${Date.now()}`, { cache: 'no-store' });
      appConfig = await res.json();
      if (appConfig && appConfig.apps) {
        appConfig.apps.forEach(app => {
          const usedEl = document.querySelector(`[data-app-used="${app.name}"]`);
          if (usedEl && app.rollingUsage) {
            usedEl.textContent = `${(app.rollingUsage.usedTokens || 0).toLocaleString()} used`;
          }
        });
      }
    } catch (e) {
      console.warn('Silent config sync error:', e);
    }
  }

  // --- Simulation Actions ---
  function setupActionHandlers() {
    // Single Request
    sendSingleBtn.addEventListener('click', async () => {
      if (isExecuting) return;
      const prompt = promptInput.value.trim();
      if (!prompt) return;
      await executeSingleRequest(prompt);
    });

    // Burst Simulation
    simulateBurstBtn.addEventListener('click', async () => {
      if (isExecuting) return;
      const count = parseInt(burstCountSelect.value, 10) || 3;
      await executeBurstSimulation(count);
    });

    // Quick switch to Gold
    quickSwitchGoldBtn.addEventListener('click', () => {
      switchApp(GOLD_SHOWCASE_APP);
      quotaExceededAlert.style.display = 'none';
      responseContent.style.display = 'none';
      responseEmptyState.style.display = 'flex';
      responseEmptyState.innerHTML = `
        <div class="empty-icon">${escapeHtml(appIcon(GOLD_SHOWCASE_APP, 'Gold'))}</div>
        <p>Switched to <strong>${escapeHtml(appLabel(GOLD_SHOWCASE_APP))}</strong> (${escapeHtml(productLabel('Gold'))}: 40,000 tokens)! Click <strong>Send Single Request</strong> or <strong>Simulate Burst</strong> to verify that higher-tier consumers process calls without throttling.</p>
      `;
    });
  }

  async function executeSingleRequest(prompt) {
    isExecuting = true;
    setLoadingState(true, 'Accessing Apigee Proxy...');
    setMeterEvaluatingState(true);
    burstStepsContainer.style.display = 'none';

    // Immediate visual feedback in Gateway Response panel
    responseEmptyState.style.display = 'none';
    quotaExceededAlert.style.display = 'none';
    tokenChipsGrid.style.display = 'grid';
    chipPromptTokens.textContent = '...';
    chipCandidatesTokens.textContent = '...';
    chipTotalTokens.textContent = '...';
    chipHttpStatus.textContent = 'Connecting...';
    chipHttpStatus.className = 'chip-value status-evaluating';
    responseLatencyPill.style.display = 'flex';
    responseLatency.textContent = 'In flight ⏳';
    responseContent.style.display = 'block';
    responseText.innerHTML = `
      <div class="gateway-calling-indicator" style="display: flex; align-items: center; gap: 12px; padding: 20px; color: var(--text-secondary); font-size: 13px;">
        <span class="spinner" style="display: inline-block; width: 18px; height: 18px; border: 2px solid var(--border-color); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
        <span>Routing to Apigee Proxy: <strong style="color: var(--primary);">gemini-token-limit-demo</strong> &bull; Querying Gemini 3.5 Flash Lite...</span>
      </div>
    `;

    let runDetail = { kind: 'single', appName: selectedApp, tier: tierOfApp(selectedApp), statusCodes: [], any429: false, totalTokens: 0 };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: selectedApp, prompt })
      });

      const data = await res.json();
      runDetail.statusCodes = [data.statusCode];
      runDetail.any429 = data.statusCode === 429;
      runDetail.totalTokens = data.totalTokens || 0;

      // =========================================================================
      // STEP 1: IMMEDIATELY SHOW RESULTS IN "Gateway Response & Token Telemetry"
      // =========================================================================
      displaySingleResponse(data);

      if (data.statusCode === 200) {
        meterStatusText.textContent = `Syncing Quota (+${(data.totalTokens || 0).toLocaleString()} tokens)...`;
      }

      // =========================================================================
      // STEP 2: BRIEF INTENTIONAL PAUSE BEFORE REFLECTING ON PROGRESS BAR
      // Gives the user visual time to see the live gateway response & telemetry first!
      // =========================================================================
      await new Promise(resolve => setTimeout(resolve, 650));

      // =========================================================================
      // STEP 3: REFLECT TOKEN CONSUMPTION ON PROGRESS BAR DIAGRAM
      // =========================================================================
      const usage = data.rollingUsage || data.rollingWindow;
      if (usage) {
        updateMeterDirectly(selectedApp, usage);
        // Add visual pulse glow to highlight consumption update
        meterProgressFill.classList.add('consumed-pulse');
        setTimeout(() => meterProgressFill.classList.remove('consumed-pulse'), 800);
      } else {
        await loadConfig();
      }

      // Background sync all apps in left panel
      loadConfigSilently();
    } catch (err) {
      console.error('Request failed:', err);
      runDetail.error = err.message;
      displayErrorState(err.message);
    } finally {
      setMeterEvaluatingState(false);
      isExecuting = false;
      setLoadingState(false);
      emitRunResult(runDetail);
    }
  }

  /** Notifies listeners (the Guided Tour) that a single or burst run finished. */
  function emitRunResult(detail) {
    window.dispatchEvent(new CustomEvent('quota:runresult', { detail }));
  }

  async function executeBurstSimulation(count) {
    isExecuting = true;
    setLoadingState(true, `Simulating burst (${count} rapid calls)...`);
    setMeterEvaluatingState(true);
    
    responseEmptyState.style.display = 'none';
    quotaExceededAlert.style.display = 'none';
    tokenChipsGrid.style.display = 'none';
    responseContent.style.display = 'none';
    burstStepsContainer.style.display = 'block';
    burstStepsList.innerHTML = '';

    const promptText = promptInput.value.trim() || presets.heavy;
    let any429 = false;
    const runDetail = { kind: 'burst', appName: selectedApp, tier: tierOfApp(selectedApp), statusCodes: [], any429: false, totalTokens: 0 };

    try {
      for (let i = 1; i <= count; i++) {
        // Render in-flight step
        const stepItem = document.createElement('div');
        stepItem.className = 'burst-step-item';
        stepItem.id = `burst-step-${i}`;
        stepItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main);">#${i}</span>
            <span style="font-size: 11.5px; color: var(--text-secondary);">Sending to Apigee gateway...</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge-pill" style="background: var(--bg-tertiary); color: var(--text-muted);">In flight ⏳</span>
          </div>
        `;
        burstStepsList.appendChild(stepItem);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: selectedApp,
            prompt: `[Burst Call ${i}/${count}] ${promptText}`
          })
        });

        const data = await res.json();
        const is200 = data.statusCode === 200;
        const tokens = data.totalTokens || 0;
        const latency = data.latencyMs || 0;
        runDetail.statusCodes.push(data.statusCode);
        runDetail.totalTokens += is200 ? tokens : 0;

        // Update step UI
        stepItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main);">#${i}</span>
            <span style="font-size: 11.5px; color: var(--text-secondary);">${is200 ? `${tokens.toLocaleString()} tokens` : (data.errorMessage || data.error || 'Quota Exceeded')}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${tokens.toLocaleString()} tokens (${latency}ms)</span>
            <span class="badge-pill ${is200 ? 'status-200' : 'status-429'}">${data.statusCode}</span>
          </div>
        `;

        // IMMEDIATELY UPDATE METER WITH THIS CALL'S UP-TO-DATE TOKEN CONSUMPTION
        const usage = data.rollingUsage || data.rollingWindow;
        if (usage) {
          updateMeterDirectly(selectedApp, usage);
        }

        if (data.statusCode === 429) {
          any429 = true;
          quotaExceededAlert.style.display = 'flex';
          quotaAlertMessage.textContent = `Apigee rate limiter engaged at Call #${i}! ${data.errorMessage || data.error || 'Quota exceeded during burst.'}`;
          break; // Stop burst sequence immediately on quota violation
        }

        // Brief delay between rapid calls for realistic visual progression
        if (i < count) {
          await new Promise(r => setTimeout(r, 200));
        }
      }

      if (!any429) {
        quotaExceededAlert.style.display = 'none';
      }

      // Sync background configs
      loadConfigSilently();

    } catch (err) {
      console.error('Burst simulation failed:', err);
      runDetail.error = err.message;
      burstStepsList.innerHTML += `<div style="color: var(--danger); padding: 8px;">Burst execution failed: ${escapeHtml(err.message)}</div>`;
    } finally {
      setMeterEvaluatingState(false);
      isExecuting = false;
      setLoadingState(false);
      runDetail.any429 = any429;
      emitRunResult(runDetail);
    }
  }

  function displaySingleResponse(data) {
    responseEmptyState.style.display = 'none';
    burstStepsContainer.style.display = 'none';

    // Latency
    responseLatencyPill.style.display = 'flex';
    responseLatency.textContent = `${data.latencyMs || 0} ms`;

    // Status chips
    tokenChipsGrid.style.display = 'grid';
    chipPromptTokens.textContent = (data.promptTokens || 0).toLocaleString();
    chipCandidatesTokens.textContent = (data.candidatesTokens || 0).toLocaleString();
    chipTotalTokens.textContent = (data.totalTokens || 0).toLocaleString();

    const is200 = data.statusCode === 200;
    const is429 = data.statusCode === 429;
    let statusLabel = 'OK';
    if (is429) statusLabel = 'Quota Exceeded';
    else if (data.statusCode === 500) statusLabel = 'Server Error';
    else if (data.statusCode === 401) statusLabel = 'Unauthorized';
    else if (data.statusCode === 403) statusLabel = 'Forbidden';
    else if (!is200) statusLabel = 'Error';

    chipHttpStatus.textContent = `${data.statusCode} ${statusLabel}`;
    chipHttpStatus.className = `chip-value ${is200 ? 'status-200' : (is429 ? 'status-429' : 'status-500')}`;

    if (data.statusCode === 429) {
      quotaExceededAlert.style.display = 'flex';
      quotaAlertMessage.textContent = data.errorMessage || data.error || 'LLM Token Quota limit exceeded for your tier. Request blocked by Apigee gateway.';
      responseContent.style.display = 'none';
    } else {
      quotaExceededAlert.style.display = 'none';
      responseContent.style.display = 'block';
      const text = data.responseText || data.response || 'No text returned';
      responseText.innerHTML = formatMarkdown(text);
    }
  }

  function displayBurstResults(data) {
    burstStepsList.innerHTML = '';
    
    let any429 = false;
    (data.steps || []).forEach(s => {
      if (s.statusCode === 429) any429 = true;
      const is200 = s.statusCode === 200;
      const item = document.createElement('div');
      item.className = 'burst-step-item';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main);">#${s.callIndex}</span>
          <span style="font-size: 11.5px; color: var(--text-secondary);">${s.summary || ''}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${s.tokens} tokens (${s.latencyMs}ms)</span>
          <span class="badge-pill ${is200 ? 'status-200' : 'status-429'}">${s.statusCode}</span>
        </div>
      `;
      burstStepsList.appendChild(item);
    });

    if (any429) {
      quotaExceededAlert.style.display = 'flex';
      quotaAlertMessage.textContent = `Apigee rate limiter engaged! ${data.summary || 'Quota exceeded during burst.'}`;
    }
  }

  function displayErrorState(msg) {
    responseEmptyState.style.display = 'none';
    quotaExceededAlert.style.display = 'flex';
    quotaAlertMessage.textContent = msg;
    responseContent.style.display = 'none';
  }

  function setLoadingState(loading, text = '') {
    sendSingleBtn.disabled = loading;
    simulateBurstBtn.disabled = loading;
    if (loading) {
      sendSingleBtn.innerHTML = `<span class="btn-icon">⏳</span><span>${text || 'Processing...'}</span>`;
    } else {
      sendSingleBtn.innerHTML = `<span class="btn-icon">🚀</span><span>Send Single Request</span>`;
    }
  }

  function formatMarkdown(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  // =========================================================================
  // ADMIN ANALYTICS CONTROLLER
  // =========================================================================
  function setupAnalyticsControls() {
    durationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        durationButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeDuration = btn.dataset.duration;
        
        const labels = {
          '1h': 'Last 1 Hour',
          '1d': 'Last 1 Day',
          '3d': 'Last 3 Days',
          '7d': 'Last 7 Days'
        };
        const durationText = labels[activeDuration] || activeDuration;
        document.getElementById('active-duration-badge').textContent = `📅 Active Window: ${durationText}`;
        ['tag-chart-product', 'tag-chart-app', 'tag-chart-dept', 'tag-chart-subdept', 'tag-chart-timeline'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = durationText;
        });

        loadAnalytics();
      });
    });

    refreshAnalyticsBtn.addEventListener('click', () => {
      loadAnalytics();
    });

    resetLedgerBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to reset the session transaction ledger?')) return;
      try {
        await fetch('/api/reset-session', { method: 'POST' });
        await loadConfig();
        await loadAnalytics();
      } catch (err) {
        console.error('Reset failed:', err);
      }
    });

    txSearchInput.addEventListener('input', () => {
      const term = txSearchInput.value.toLowerCase().trim();
      const rows = txTableBody.querySelectorAll('tr');
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(term) ? '' : 'none';
      });
    });
  }

  async function loadAnalytics() {
    refreshAnalyticsBtn.disabled = true;
    refreshAnalyticsBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Updating...</span>';

    try {
      const res = await fetch(`/api/analytics?duration=${activeDuration}&_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      lastAnalyticsData = data;

      updateKPIs(data.kpis);
      renderCharts(data);
      const txList = data.recentTransactions || data.transactions || [];
      renderTransactionTable(txList, data.duration);

      const countEl = document.getElementById('tx-table-count');
      if (countEl) {
        countEl.textContent = `${txList.length} transactions`;
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      refreshAnalyticsBtn.disabled = false;
      refreshAnalyticsBtn.innerHTML = '<span class="btn-icon">🔄</span><span>Refresh</span>';
    }
  }

  function updateKPIs(kpis) {
    if (!kpis) return;
    document.getElementById('kpi-total-requests').textContent = (kpis.total_requests || 0).toLocaleString();
    document.getElementById('kpi-requests-breakdown').textContent = `${(kpis.success_requests || 0).toLocaleString()} Success • ${(kpis.quota_violations || 0).toLocaleString()} Throttled`;

    document.getElementById('kpi-total-tokens').textContent = (kpis.total_tokens || 0).toLocaleString();
    document.getElementById('kpi-tokens-breakdown').textContent = `${(kpis.total_prompt_tokens || 0).toLocaleString()} Prompt • ${(kpis.total_candidates_tokens || 0).toLocaleString()} Response`;

    document.getElementById('kpi-quota-violations').textContent = (kpis.quota_violations || 0).toLocaleString();
    document.getElementById('kpi-violation-rate').textContent = `${kpis.quota_violation_rate || 0}% Rate`;

    document.getElementById('kpi-avg-latency').textContent = `${kpis.avg_latency_ms || 0} ms`;
  }

  // --- Chart.js Visualizations ---
  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      isDark,
      textColor: isDark ? '#94a3b8' : '#64748b',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
      doughnutBorder: isDark ? '#111827' : '#ffffff'
    };
  }

  function renderCharts(data) {
    // 1. Chart Product
    const pLabels = (data.byProduct || []).map(p => productLabel(p.tier));
    const pTokens = (data.byProduct || []).map(p => p.total_tokens);
    renderBarChart('chart-product', pLabels, pTokens, 'Tokens Consumed', ['#94a3b8', '#f59e0b', '#38bdf8', '#818cf8']);

    // 2. Chart App
    const aLabels = (data.byApp || []).map(a => appLabel(a.app_name, a.app_name.replace('Gemini-', '')));
    const aTokens = (data.byApp || []).map(a => a.total_tokens);
    renderBarChart('chart-app', aLabels, aTokens, 'Tokens Consumed', ['#38bdf8', '#818cf8', '#f59e0b', '#ec4899']);

    // 3 & 4. Custom attribute charts are re-grouped from the per-app breakdown so
    // that the active scenario's attribute values drive the grouping.
    const groupByAttr = (key, fallbackField) => {
      const totals = new Map();
      (data.byApp || []).forEach(a => {
        const label = appAttr(a.app_name, key, a[fallbackField]);
        totals.set(label, (totals.get(label) || 0) + (a.total_tokens || 0));
      });
      return [...totals.entries()].sort((x, y) => y[1] - x[1]);
    };

    // 3. Chart Attribute 1 (Department)
    const dGroups = groupByAttr('attr1', 'department');
    const dLabels = dGroups.map(g => g[0]);
    const dTokens = dGroups.map(g => g[1]);
    renderDoughnutChart('chart-department', dLabels, dTokens, ['#10b981', '#6366f1', '#f59e0b', '#ec4899']);

    // 4. Chart Attribute 2 (Sub-Department)
    const sGroups = groupByAttr('attr2', 'sub_department');
    const sLabels = sGroups.map(g => g[0]);
    const sTokens = sGroups.map(g => g[1]);
    renderHorizontalBarChart('chart-sub-department', sLabels, sTokens, 'Tokens Consumed', '#a855f7');

    // 5. Timeline Chart
    const tLabels = (data.timeline || []).map(t => t.label || t.time_bucket);
    const tTokens = (data.timeline || []).map(t => t.total_tokens);
    renderLineChart('chart-timeline', tLabels, tTokens, 'Tokens Consumed');
  }

  function renderBarChart(canvasId, labels, data, datasetLabel, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    const tc = getThemeColors();

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Traffic'],
        datasets: [{
          label: datasetLabel,
          data: data.length ? data : [0],
          backgroundColor: colors.length >= labels.length ? colors : '#1a73e8',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} tokens`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, 
            grid: { display: false } 
          },
          y: { 
            ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, 
            grid: { color: tc.gridColor } 
          }
        }
      }
    });
  }

  function renderHorizontalBarChart(canvasId, labels, data, datasetLabel, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    const tc = getThemeColors();

    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Traffic'],
        datasets: [{
          label: datasetLabel,
          data: data.length ? data : [0],
          backgroundColor: color,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} tokens`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, 
            grid: { color: tc.gridColor } 
          },
          y: { 
            ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, 
            grid: { display: false } 
          }
        }
      }
    });
  }

  function renderDoughnutChart(canvasId, labels, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    const tc = getThemeColors();

    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No Traffic'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: colors,
          borderColor: tc.doughnutBorder,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw.toLocaleString()} tokens`
            }
          }
        }
      }
    });
  }

  function renderLineChart(canvasId, labels, data, datasetLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    const tc = getThemeColors();

    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No Traffic'],
        datasets: [{
          label: datasetLabel,
          data: data.length ? data : [0],
          borderColor: '#1a73e8',
          backgroundColor: 'rgba(26, 115, 232, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#1a73e8',
          pointBorderColor: tc.doughnutBorder,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw.toLocaleString()} tokens`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, 
            grid: { display: false } 
          },
          y: { 
            ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, 
            grid: { color: tc.gridColor } 
          }
        }
      }
    });
  }

  // --- Render Transaction Table ---
  function renderTransactionTable(txs, durationLabel) {
    if (!txs || txs.length === 0) {
      txTableBody.innerHTML = `<tr><td colspan="8" class="empty-cell">No transactions recorded for ${durationLabel || 'this period'}. Run a simulation to populate the ledger!</td></tr>`;
      return;
    }

    txTableBody.innerHTML = '';
    txs.forEach(t => {
      const is200 = t.status_code === 200;
      const isGold = t.tier === 'Gold';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${escapeHtml(t.timestamp)}</td>
        <td title="Apigee app: ${escapeHtml(t.app_name)}"><strong style="color: var(--text-main);">${escapeHtml(appIcon(t.app_name, t.tier))} ${escapeHtml(appLabel(t.app_name))}</strong></td>
        <td title="Apigee product: ${escapeHtml(t.api_product)}"><span class="badge-pill ${isGold ? 'tier-gold' : 'tier-silver'}">${escapeHtml(productLabel(t.tier))}</span></td>
        <td>${escapeHtml(appAttr(t.app_name, 'attr1', t.department))}</td>
        <td>${escapeHtml(appAttr(t.app_name, 'attr2', t.sub_department))}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${t.prompt_tokens} / ${t.candidates_tokens} / <strong>${t.total_tokens}</strong></td>
        <td><span class="badge-pill ${t.status_code === 200 ? 'status-200' : (t.status_code === 429 ? 'status-429' : 'status-500')}">${t.status_code} ${t.status_code === 200 ? 'OK' : (t.status_code === 429 ? 'Quota Exceeded' : 'Error')}</span></td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${t.latency_ms} ms</td>
      `;
      txTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // APP-SPECIFIC ADMIN ANALYTICS CONTROLLER
  // =========================================================================
  function setupAppAdminDrawer() {
    function openAppAdminDrawer(targetAppName) {
      if (adminDrawer) adminDrawer.classList.remove('open');
      if (appAdminDrawer) appAdminDrawer.classList.add('open');
      if (adminDrawerBackdrop) adminDrawerBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';

      if (targetAppName) {
        selectedAppSpecific = targetAppName;
      }
      setTimeout(() => {
        loadAppSpecificAnalytics();
      }, 50);
      setTimeout(() => {
        Object.values(appCharts).forEach(c => {
          if (c && typeof c.resize === 'function') c.resize();
        });
      }, 350);
    }

    function closeAppAdminDrawer() {
      if (appAdminDrawer) appAdminDrawer.classList.remove('open');
      if (!adminDrawer || !adminDrawer.classList.contains('open')) {
        if (adminDrawerBackdrop) adminDrawerBackdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    window.closeAppAdminDrawer = closeAppAdminDrawer;

    if (btnOpenAppAdminDrawer) {
      btnOpenAppAdminDrawer.addEventListener('click', () => openAppAdminDrawer());
    }
    if (floatingAppAdminTrigger) {
      floatingAppAdminTrigger.addEventListener('click', () => openAppAdminDrawer());
    }
    if (btnCloseAppAdminDrawer) {
      btnCloseAppAdminDrawer.addEventListener('click', closeAppAdminDrawer);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && appAdminDrawer && appAdminDrawer.classList.contains('open')) {
        closeAppAdminDrawer();
      }
    });

    if (refreshAppAnalyticsBtn) {
      refreshAppAnalyticsBtn.addEventListener('click', () => {
        loadAppSpecificAnalytics();
      });
    }

    const appDurationButtons = document.querySelectorAll('#appDurationPills .duration-btn');
    appDurationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        appDurationButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeAppDuration = btn.dataset.duration;

        const labels = {
          '1h': 'Last 1 Hour',
          '1d': 'Last 1 Day',
          '3d': 'Last 3 Days',
          '7d': 'Last 7 Days'
        };
        const durationText = labels[activeAppDuration] || activeAppDuration;
        const badge = document.getElementById('active-app-duration-badge');
        if (badge) badge.textContent = `📅 Active Window: ${durationText}`;

        loadAppSpecificAnalytics();
      });
    });
  }

  async function loadAppSpecificAnalytics() {
    if (refreshAppAnalyticsBtn) {
      refreshAppAnalyticsBtn.disabled = true;
      refreshAppAnalyticsBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Updating...</span>';
    }

    try {
      const res = await fetch(`/api/analytics/app-specific?appName=${encodeURIComponent(selectedAppSpecific)}&duration=${activeAppDuration}&_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      renderAppSpecificSelector(data.allApps, data.app.name);
      renderSelectedAppBanner(data.app, data.rollingUsage);
      renderAppTokenKPIs(data.consumption, data.rollingUsage);
      renderAppCharts(data);
    } catch (err) {
      console.error('Failed to load app-specific analytics:', err);
    } finally {
      if (refreshAppAnalyticsBtn) {
        refreshAppAnalyticsBtn.disabled = false;
        refreshAppAnalyticsBtn.innerHTML = '<span class="btn-icon">🔄</span><span>Refresh</span>';
      }
    }
  }

  function renderAppSpecificSelector(allApps, activeName) {
    if (!appSpecificSelector || !allApps) return;
    appSpecificSelector.innerHTML = '';

    allApps.forEach(app => {
      const isActive = app.name === activeName;
      const isGold = app.tier === 'Gold';
      const btn = document.createElement('div');
      btn.className = `app-select-btn ${isActive ? 'active' : ''}`;
      btn.innerHTML = `
        <div class="app-select-btn-header">
          <span class="app-select-btn-icon">${escapeHtml(appIcon(app.name, app.tier))}</span>
          <span class="tier-pill ${isGold ? 'gold' : 'silver'}">${escapeHtml(productLabel(app.tier))}</span>
        </div>
        <span class="app-select-btn-name">${escapeHtml(appLabel(app.name, app.displayName))}</span>
        <div class="app-select-btn-meta">
          <span>${app.quotaLimit >= 1000 ? (app.quotaLimit / 1000) + 'K' : app.quotaLimit}/5m</span>
          <span>${(app.rollingUsedTokens || 0).toLocaleString()} used</span>
        </div>
      `;

      btn.addEventListener('click', () => {
        selectedAppSpecific = app.name;
        loadAppSpecificAnalytics();
      });

      appSpecificSelector.appendChild(btn);
    });
  }

  function renderSelectedAppBanner(app, rolling) {
    const isGold = app.tier === 'Gold';
    const bannerAppIcon = document.getElementById('bannerAppIcon');
    if (bannerAppIcon) bannerAppIcon.textContent = appIcon(app.name, app.tier);

    const nameEl = document.getElementById('bannerAppName');
    if (nameEl) {
      nameEl.textContent = appLabel(app.name, app.displayName);
      nameEl.title = `Apigee Developer App: ${app.name}`;
    }

    const tierEl = document.getElementById('bannerAppTier');
    if (tierEl) {
      tierEl.className = `tier-pill ${isGold ? 'gold' : 'silver'}`;
      tierEl.textContent = productLabel(app.tier);
    }

    const statusEl = document.getElementById('bannerAppStatus');
    if (statusEl) {
      const isExhausted = rolling && rolling.isExhausted;
      statusEl.className = `status-pill ${isExhausted ? 'exhausted' : 'active'}`;
      statusEl.textContent = isExhausted ? 'Quota Exhausted' : 'Active (Available)';
    }

    const descEl = document.getElementById('bannerAppDesc');
    if (descEl) descEl.textContent = appDesc(app.name, app.description);

    const deptEl = document.getElementById('bannerAppDept');
    if (deptEl) {
      deptEl.textContent = `🏢 ${appAttr(app.name, 'attr1', app.department)} / ${appAttr(app.name, 'attr2', app.subDepartment)}`;
      deptEl.title = `${attrLabel('attr1')} / ${attrLabel('attr2')} (Apigee custom attributes: Department / Sub Department)`;
    }

    const prodEl = document.getElementById('bannerAppProduct');
    if (prodEl) {
      const realProduct = SP.PRODUCT_REAL_NAMES[normTier(app.tier)];
      prodEl.textContent = `📦 ${productLabel(app.tier)} (${realProduct})`;
    }

    const rateEl = document.getElementById('bannerAppRate');
    if (rateEl) rateEl.textContent = `⚡ ${(app.quotaLimit / 1000)}K tokens / ${app.quotaWindowMinutes}m`;

    const keyEl = document.getElementById('bannerAppKey');
    if (keyEl) keyEl.textContent = `🔑 ${app.apiKeyMasked}`;
  }

  function renderAppTokenKPIs(c, rolling) {
    if (!c) return;
    const callsEl = document.getElementById('app-kpi-calls');
    if (callsEl) callsEl.textContent = (c.total_requests || 0).toLocaleString();

    const callsSub = document.getElementById('app-kpi-calls-sub');
    if (callsSub) callsSub.textContent = `${(c.success_requests || 0).toLocaleString()} Success • ${(c.quota_violations || 0).toLocaleString()} Throttled`;

    const tokensEl = document.getElementById('app-kpi-tokens');
    if (tokensEl) tokensEl.textContent = (c.total_tokens || 0).toLocaleString();

    const tokensSub = document.getElementById('app-kpi-tokens-sub');
    if (tokensSub) tokensSub.textContent = `${(c.prompt_tokens || 0).toLocaleString()} In • ${(c.candidates_tokens || 0).toLocaleString()} Out`;

    const statusEl = document.getElementById('app-kpi-quota-status');
    if (statusEl) {
      const isExh = rolling && rolling.isExhausted;
      statusEl.textContent = isExh ? 'EXHAUSTED (429)' : 'ACTIVE (200)';
      statusEl.style.color = isExh ? 'var(--danger)' : 'var(--success)';
    }

    const quotaSub = document.getElementById('app-kpi-quota-sub');
    if (quotaSub) quotaSub.textContent = `${(rolling ? rolling.remainingTokens : 0).toLocaleString()} remaining`;

    const latencyEl = document.getElementById('app-kpi-latency');
    if (latencyEl) latencyEl.textContent = `${(c.avg_latency_ms || 0)} ms`;
  }

  function renderAppCharts(data) {
    const tc = getThemeColors();

    // Timeline Chart for this app
    const ctxTimeline = document.getElementById('appTokenTimelineChart');
    if (ctxTimeline && data.timeline) {
      if (appCharts.timeline) appCharts.timeline.destroy();
      const labels = data.timeline.map(t => t.label);
      const tokens = data.timeline.map(t => t.total_tokens);
      const calls = data.timeline.map(t => t.requests);

      appCharts.timeline = new Chart(ctxTimeline, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'bar',
              label: 'Tokens Consumed',
              data: tokens,
              backgroundColor: 'rgba(26, 115, 232, 0.7)',
              borderRadius: 3,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'API Calls',
              data: calls,
              borderColor: '#34A853',
              backgroundColor: 'rgba(52, 168, 83, 0.15)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } } }
          },
          scales: {
            x: { ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 9 } }, grid: { display: false } },
            y: { position: 'left', ticks: { color: tc.textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }, grid: { color: tc.gridColor } },
            y1: { position: 'right', grid: { display: false }, ticks: { color: '#34A853', font: { family: 'Plus Jakarta Sans', size: 10 } } }
          }
        }
      });
    }
  }

  // =========================================================================
  // SCENARIO SETTINGS (display-only relabeling)
  // =========================================================================

  /** Applies the active scenario to static labels in the page. */
  function applyScenarioStatic() {
    const silver = productLabel('Silver');
    const gold = productLabel('Gold');
    const a1 = attrLabel('attr1');
    const a2 = attrLabel('attr2');
    const [s1, s2, g1, g2] = SP.APP_KEYS.map(k => appLabel(k));

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    setText('header-scenario-icon', scenario.icon);
    setText('header-scenario-name', scenario.name);
    setText('app-section-title', scenario.appSectionTitle);
    setText('quick-switch-gold-label', `⚡ Switch to ${appLabel(GOLD_SHOWCASE_APP)} (${gold} · 40,000 Tokens)`);
    setText('chart-title-product', `Tokens by API Product (${silver} vs ${gold})`);
    setText('chart-title-dept', `Tokens by ${a1}`);
    setText('chart-title-subdept', `Tokens by ${a2}`);
    setText('th-attr1', a1);
    setText('th-attr2', a2);

    const tip = document.getElementById('demo-tip-text');
    if (tip) {
      tip.innerHTML = `Using <em>${escapeHtml(s1)}</em> (${escapeHtml(silver)}: 4,000 tokens) with the <em>Heavy Quota Burner</em> prompt will exhaust the token quota in <strong>2 to 3 calls</strong>, triggering an instant <code>HTTP 429 RESOURCE_EXHAUSTED</code>! Switch to <em>${escapeHtml(g1)}</em> (${escapeHtml(gold)}: 40,000 tokens) to see all calls succeed effortlessly.`;
    }

    const step1 = document.getElementById('arch-step1-desc');
    if (step1) {
      step1.innerHTML = `<strong>${escapeHtml(silver)}:</strong> ${escapeHtml(s1)} &amp; ${escapeHtml(s2)} (4k limit). <strong>${escapeHtml(gold)}:</strong> ${escapeHtml(g1)} &amp; ${escapeHtml(g2)} (40k limit). Authenticates via <code>x-api-key</code>.`;
    }

    if (txSearchInput) {
      txSearchInput.placeholder = `Filter by name, ${a1.toLowerCase()}, ${a2.toLowerCase()} or status...`;
    }

    // Swap sample prompts to match the scenario
    presets = { ...scenario.prompts };
    const activeBtn = document.querySelector('.preset-btn.active');
    const key = activeBtn && presets[activeBtn.dataset.preset] ? activeBtn.dataset.preset : 'medium';
    promptInput.value = presets[key];
    updateCharCount();
  }

  /** Re-renders every scenario-dependent part of the UI. */
  function rerenderForScenario() {
    applyScenarioStatic();
    if (appConfig && appConfig.apps) {
      renderAppsGrid(appConfig.apps);
      updateMeterForSelectedApp();
    }
    if (lastAnalyticsData) {
      renderCharts(lastAnalyticsData);
      renderTransactionTable(lastAnalyticsData.recentTransactions || lastAnalyticsData.transactions || [], lastAnalyticsData.duration);
    }
    if (adminDrawer && adminDrawer.classList.contains('open') && activeAdminTab === 'app-specific') {
      loadAppSpecificAnalytics();
    }
  }

  function setupScenarioSettings() {
    const modal = document.getElementById('scenarioModal');
    const openBtn = document.getElementById('btnOpenScenarioSettings');
    const closeBtn = document.getElementById('btnCloseScenarioModal');
    const cancelBtn = document.getElementById('btnCancelScenario');
    const applyBtn = document.getElementById('btnApplyScenario');
    const resetBtn = document.getElementById('btnResetScenario');
    const grid = document.getElementById('scenarioPresetGrid');
    const form = document.getElementById('scenarioForm');
    const storyEl = document.getElementById('scenarioStory');
    if (!modal || !openBtn || !grid || !form) return;

    const L = SP.LIMITS;
    let draft = null;
    let refs = {};

    const clone = (o) => JSON.parse(JSON.stringify(o));

    function openModal() {
      draft = clone(scenario);
      renderGrid();
      renderForm();
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      draft = null;
    }

    function updateStory() {
      if (!storyEl || !draft) return;
      storyEl.textContent = draft.id === 'custom'
        ? `✏️ Custom labels, based on "${(SP.PRESETS[draft.baseId] || SP.PRESETS[SP.DEFAULT_PRESET_ID]).name}". Click Apply to use them.`
        : `${draft.icon} ${draft.story}`;
    }

    function renderGrid() {
      grid.innerHTML = '';
      const items = SP.PRESET_ORDER.map(id => SP.PRESETS[id]).concat([{
        id: 'custom', name: 'Custom', icon: '✏️', story: 'Use your own names and labels.'
      }]);
      items.forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `scenario-preset-card${draft.id === p.id ? ' active' : ''}${p.id === SP.ORIGINAL_PRESET_ID ? ' classic' : ''}`;
        card.setAttribute('aria-pressed', draft.id === p.id ? 'true' : 'false');

        const icon = document.createElement('span');
        icon.className = 'scenario-preset-icon';
        icon.textContent = p.icon;
        const name = document.createElement('span');
        name.className = 'scenario-preset-name';
        name.textContent = p.name;
        const desc = document.createElement('span');
        desc.className = 'scenario-preset-desc';
        desc.textContent = p.id === 'custom'
          ? 'Use your own names and labels.'
          : `${p.products.Silver.label} / ${p.products.Gold.label}`;
        card.append(icon, name, desc);

        card.addEventListener('click', () => selectPreset(p.id));
        grid.appendChild(card);
      });
      updateStory();
    }

    function selectPreset(id) {
      if (id === 'custom') {
        markCustom(null);
        return;
      }
      draft = SP.getPreset(id);
      renderGrid();
      renderForm();
    }

    /** Switches the draft to Custom mode when the user edits any field. */
    function markCustom(editedField) {
      if (draft.id === 'custom') return;
      draft.baseId = SP.PRESETS[draft.id] ? draft.id : SP.DEFAULT_PRESET_ID;
      draft.id = 'custom';
      if (editedField !== 'name') {
        draft.name = Array.from(`Custom · ${SP.PRESETS[draft.baseId].name}`).slice(0, L.MAX_LABEL).join('');
        if (refs.name) refs.name.value = draft.name;
      }
      if (editedField !== 'icon') {
        draft.icon = '✏️';
        if (refs.icon) refs.icon.value = draft.icon;
      }
      renderGrid();
    }

    function makeInput(value, maxLen, onChange, opts = {}) {
      const el = document.createElement(opts.multiline ? 'textarea' : 'input');
      if (!opts.multiline) el.type = 'text';
      el.className = `scenario-input${opts.small ? ' small' : ''}`;
      el.value = value;
      el.maxLength = maxLen;
      el.spellcheck = false;
      if (opts.rows) el.rows = opts.rows;
      if (opts.placeholder) el.placeholder = opts.placeholder;
      if (opts.ariaLabel) el.setAttribute('aria-label', opts.ariaLabel);
      el.addEventListener('input', () => onChange(el.value));
      return el;
    }

    function makeField(labelText, inputEl, hintText) {
      const wrap = document.createElement('label');
      wrap.className = 'scenario-field';
      const lbl = document.createElement('span');
      lbl.className = 'scenario-field-label';
      lbl.textContent = labelText;
      wrap.appendChild(lbl);
      wrap.appendChild(inputEl);
      if (hintText) {
        const hint = document.createElement('span');
        hint.className = 'scenario-field-hint';
        hint.textContent = hintText;
        wrap.appendChild(hint);
      }
      return wrap;
    }

    function makeGroup(title) {
      const g = document.createElement('div');
      g.className = 'scenario-group';
      const h = document.createElement('div');
      h.className = 'scenario-group-title';
      h.textContent = title;
      g.appendChild(h);
      return g;
    }

    function renderForm() {
      form.innerHTML = '';
      refs = {};

      // General
      const general = makeGroup('General');
      const generalRow = document.createElement('div');
      generalRow.className = 'scenario-row cols-3';
      refs.icon = makeInput(draft.icon, L.MAX_ICON, v => { draft.icon = v; markCustom('icon'); }, { small: true, ariaLabel: 'Scenario icon' });
      refs.name = makeInput(draft.name, L.MAX_LABEL, v => { draft.name = v; markCustom('name'); }, { ariaLabel: 'Scenario name' });
      const sectionTitle = makeInput(draft.appSectionTitle, L.MAX_LABEL, v => { draft.appSectionTitle = v; markCustom(); }, { ariaLabel: 'App list title' });
      generalRow.append(
        makeField('Icon', refs.icon),
        makeField('Scenario name', refs.name, 'Shown on the header button'),
        makeField('App list title', sectionTitle, 'Left panel heading')
      );
      general.appendChild(generalRow);
      form.appendChild(general);

      // API Products
      const products = makeGroup('API Products');
      ['Silver', 'Gold'].forEach(tier => {
        const row = document.createElement('div');
        row.className = 'scenario-row cols-icon';
        const iconIn = makeInput(draft.products[tier].icon, L.MAX_ICON, v => { draft.products[tier].icon = v; markCustom(); }, { small: true, ariaLabel: `${tier} product icon` });
        const labelIn = makeInput(draft.products[tier].label, L.MAX_LABEL, v => { draft.products[tier].label = v; markCustom(); }, { ariaLabel: `${tier} product label` });
        row.append(
          makeField('Icon', iconIn),
          makeField(`${tier === 'Gold' ? 'Higher' : 'Lower'} tier label`, labelIn, `Maps to ${SP.PRODUCT_REAL_NAMES[tier]} · ${tier === 'Gold' ? '40,000' : '4,000'} tokens / 5 min`)
        );
        products.appendChild(row);
      });
      form.appendChild(products);

      // Custom attribute labels
      const attrs = makeGroup('Custom Attribute Labels');
      const attrRow = document.createElement('div');
      attrRow.className = 'scenario-row cols-2';
      const a1In = makeInput(draft.attrLabels.attr1, L.MAX_LABEL, v => { draft.attrLabels.attr1 = v; if (refs.th1) refs.th1.textContent = v || 'Attribute 1'; markCustom(); }, { ariaLabel: 'Attribute 1 label' });
      const a2In = makeInput(draft.attrLabels.attr2, L.MAX_LABEL, v => { draft.attrLabels.attr2 = v; if (refs.th2) refs.th2.textContent = v || 'Attribute 2'; markCustom(); }, { ariaLabel: 'Attribute 2 label' });
      attrRow.append(
        makeField('Attribute 1 label', a1In, 'Maps to Apigee attribute "Department" (dc_department)'),
        makeField('Attribute 2 label', a2In, 'Maps to Apigee attribute "Sub Department" (dc_sub_department)')
      );
      attrs.appendChild(attrRow);
      form.appendChild(attrs);

      // Developer Apps
      const apps = makeGroup('Developer Apps');
      const header = document.createElement('div');
      header.className = 'scenario-app-row scenario-app-header';
      const hIcon = document.createElement('span'); hIcon.textContent = 'Icon';
      const hName = document.createElement('span'); hName.textContent = 'Display name';
      refs.th1 = document.createElement('span'); refs.th1.textContent = draft.attrLabels.attr1;
      refs.th2 = document.createElement('span'); refs.th2.textContent = draft.attrLabels.attr2;
      header.append(hIcon, hName, refs.th1, refs.th2);
      apps.appendChild(header);

      SP.APP_KEYS.forEach(key => {
        const a = draft.apps[key];
        const tier = SP.APP_TIERS[key];
        const row = document.createElement('div');
        row.className = 'scenario-app-row';
        row.append(
          makeInput(a.icon, L.MAX_ICON, v => { a.icon = v; markCustom(); }, { small: true, ariaLabel: `${key} icon` }),
          makeInput(a.name, L.MAX_LABEL, v => { a.name = v; markCustom(); }, { ariaLabel: `${key} display name` }),
          makeInput(a.attr1, L.MAX_LABEL, v => { a.attr1 = v; markCustom(); }, { ariaLabel: `${key} attribute 1` }),
          makeInput(a.attr2, L.MAX_LABEL, v => { a.attr2 = v; markCustom(); }, { ariaLabel: `${key} attribute 2` })
        );
        const hint = document.createElement('div');
        hint.className = 'scenario-app-hint';
        hint.textContent = `Maps to ${key} · ${SP.PRODUCT_REAL_NAMES[tier]}`;
        const descIn = makeInput(a.description, L.MAX_DESC, v => { a.description = v; markCustom(); }, { placeholder: 'Short description', ariaLabel: `${key} description` });
        descIn.classList.add('scenario-app-desc');
        apps.append(row, descIn, hint);
      });
      form.appendChild(apps);

      // Sample prompts
      const promptsDetails = document.createElement('details');
      promptsDetails.className = 'scenario-group scenario-prompts';
      const summary = document.createElement('summary');
      summary.className = 'scenario-group-title';
      summary.textContent = 'Sample Prompts (Light / Medium / Heavy)';
      promptsDetails.appendChild(summary);
      [['light', '⚡ Light Query'], ['medium', '📝 Medium Analysis'], ['heavy', '💥 Heavy Quota Burner']].forEach(([k, label]) => {
        const ta = makeInput(draft.prompts[k], L.MAX_PROMPT, v => { draft.prompts[k] = v; markCustom(); }, { multiline: true, rows: k === 'heavy' ? 3 : 2, ariaLabel: `${label} prompt` });
        promptsDetails.appendChild(makeField(label, ta));
      });
      form.appendChild(promptsDetails);
    }

    function commit(cfg) {
      scenario = cfg;
      SP.saveActive(scenario);
      closeModal();
      rerenderForScenario();
    }

    function applyDraft() {
      if (!draft) return;
      if (draft.id !== 'custom' && SP.PRESETS[draft.id]) {
        commit(SP.getPreset(draft.id));
        return;
      }
      const baseId = SP.PRESETS[draft.baseId] ? draft.baseId : SP.DEFAULT_PRESET_ID;
      const cfg = SP.normalizeConfig(draft, baseId);
      cfg.id = 'custom';
      cfg.baseId = baseId;
      commit(cfg);
    }

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (applyBtn) applyBtn.addEventListener('click', applyDraft);
    if (resetBtn) resetBtn.addEventListener('click', () => commit(SP.getPreset(SP.ORIGINAL_PRESET_ID)));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });
  }

});

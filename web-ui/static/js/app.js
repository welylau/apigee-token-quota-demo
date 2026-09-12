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

  const presets = {
    light: "Write a 1-sentence definition of API quota.",
    medium: "Summarize how Apigee secures Gemini AI APIs in 2 short bullet points.",
    heavy: "Write a detailed, comprehensive 500-word essay explaining the history of telecommunications and television broadcasting from 1920 to 2026."
  };

  // --- DOM Elements ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
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
  const durationButtons = document.querySelectorAll('.duration-btn');
  const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
  const resetLedgerBtn = document.getElementById('reset-ledger-btn');
  const txSearchInput = document.getElementById('tx-search-input');
  const txTableBody = document.getElementById('tx-table-body');

  // Theme & Modal Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const archInfoBtn = document.getElementById('archInfoBtn');
  const archModal = document.getElementById('archModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // --- Initialize ---
  init();

  async function init() {
    initTheme();
    initSplitter();
    setupArchModal();
    setupTabNavigation();
    setupPromptPresets();
    setupActionHandlers();
    setupAnalyticsControls();
    
    // Default prompt
    promptInput.value = presets.medium;
    updateCharCount();

    // Initial load
    await loadConfig();
    await loadAnalytics();
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
    if (archInfoBtn && archModal) {
      archInfoBtn.addEventListener('click', () => {
        archModal.classList.add('active');
      });
    }
    if (closeModalBtn && archModal) {
      closeModalBtn.addEventListener('click', () => {
        archModal.classList.remove('active');
      });
    }
    if (archModal) {
      archModal.addEventListener('click', (e) => {
        if (e.target === archModal) {
          archModal.classList.remove('active');
        }
      });
    }
  }

  // --- Tabs Navigation ---
  function setupTabNavigation() {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) {
          targetTab.classList.add('active');
          if (btn.dataset.tab === 'analytics-tab') {
            loadAnalytics();
          }
        }
      });
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

      document.getElementById('header-org').textContent = appConfig.org;
      document.getElementById('header-env').textContent = appConfig.env;

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
      card.className = `app-card ${isSelected ? 'selected' : ''}`;
      card.dataset.appName = app.name;

      card.innerHTML = `
        <div class="app-card-top">
          <div class="app-icon">${isGold ? '👑' : '📺'}</div>
          <span class="tier-legend ${isGold ? 'gold' : 'silver'}">${app.tier} Tier</span>
        </div>
        <div>
          <h4 class="app-card-title">${app.displayName}</h4>
          <div class="app-card-meta">
            <div>Dept: <strong>${app.department}</strong></div>
            <div>Sub Dept: <strong>${app.subDepartment}</strong></div>
          </div>
        </div>
        <div class="app-card-quota-strip ${isGold ? 'gold' : 'silver'}">
          <span>Limit: ${app.quotaLimit.toLocaleString()} tokens / 5m</span>
          <span class="app-card-used" data-app-used="${app.name}">${rolling.usedTokens.toLocaleString()} used</span>
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
    const tierName = appInfo ? appInfo.tier : (isGold ? 'Gold' : 'Silver');
    const deptText = appInfo ? `${appInfo.department} / ${appInfo.subDepartment}` : (isGold ? 'Network / Core division' : 'Manufacturing / Smart TV division');
    const descText = appInfo ? `${appInfo.description} • Quota: ${limit.toLocaleString()} tokens / 5 mins` : `Quota: ${limit.toLocaleString()} tokens / 5 mins`;

    // Cache updated rolling usage in appConfig
    if (appInfo) {
      appInfo.rollingUsage = rollingUsage;
    }

    // Update app card in left panel grid immediately
    const usedEl = document.querySelector(`[data-app-used="${appName}"]`);
    if (usedEl) {
      usedEl.textContent = `${(rollingUsage.usedTokens || 0).toLocaleString()} used`;
    }

    // Only update main meter banner if this is the currently selected app
    if (appName !== selectedApp) return;

    // Remove any evaluating pulse states
    setMeterEvaluatingState(false);

    meterTierTag.className = `tier-tag ${isGold ? 'gold' : 'silver'}`;
    meterTierTag.textContent = `${tierName} Tier`;
    meterAppName.textContent = appName;
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
      switchApp('Gemini-Premium-Network-Core-App');
      quotaExceededAlert.style.display = 'none';
      responseContent.style.display = 'none';
      responseEmptyState.style.display = 'flex';
      responseEmptyState.innerHTML = `
        <div class="empty-icon">👑</div>
        <p>Switched to <strong>Gemini-Premium-Network-Core-App</strong> (Gold Tier: 40,000 tokens)! Click <strong>Send Single Request</strong> or <strong>Simulate Burst</strong> to verify that premium apps process calls without throttling.</p>
      `;
    });
  }

  async function executeSingleRequest(prompt) {
    isExecuting = true;
    setLoadingState(true, 'Sending to Apigee Gateway...');
    setMeterEvaluatingState(true);
    burstStepsContainer.style.display = 'none';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName: selectedApp, prompt })
      });

      const data = await res.json();
      displaySingleResponse(data);

      // IMMEDIATELY update meter with returned rolling usage
      const usage = data.rollingUsage || data.rollingWindow;
      if (usage) {
        updateMeterDirectly(selectedApp, usage);
      } else {
        await loadConfig();
      }

      // Background sync all apps in left panel
      loadConfigSilently();
    } catch (err) {
      console.error('Request failed:', err);
      displayErrorState(err.message);
    } finally {
      setMeterEvaluatingState(false);
      isExecuting = false;
      setLoadingState(false);
    }
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
      burstStepsList.innerHTML += `<div style="color: var(--danger); padding: 8px;">Burst execution failed: ${err.message}</div>`;
    } finally {
      setMeterEvaluatingState(false);
      isExecuting = false;
      setLoadingState(false);
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
    chipHttpStatus.textContent = `${data.statusCode} ${is200 ? 'OK' : 'Quota Exceeded'}`;
    chipHttpStatus.className = `chip-value ${is200 ? 'status-200' : 'status-429'}`;

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
        await fetch('/api/reset', { method: 'POST' });
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
      renderTransactionTable(data.transactions, data.duration);

      const countEl = document.getElementById('tx-table-count');
      if (countEl) {
        countEl.textContent = `${(data.transactions || []).length} transactions`;
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
    const pLabels = (data.byProduct || []).map(p => p.api_product);
    const pTokens = (data.byProduct || []).map(p => p.total_tokens);
    renderBarChart('chart-product', pLabels, pTokens, 'Tokens Consumed', ['#94a3b8', '#f59e0b', '#38bdf8', '#818cf8']);

    // 2. Chart App
    const aLabels = (data.byApp || []).map(a => a.app_name.replace('Gemini-', ''));
    const aTokens = (data.byApp || []).map(a => a.total_tokens);
    renderBarChart('chart-app', aLabels, aTokens, 'Tokens Consumed', ['#38bdf8', '#818cf8', '#f59e0b', '#ec4899']);

    // 3. Chart Department
    const dLabels = (data.byDepartment || []).map(d => d.department);
    const dTokens = (data.byDepartment || []).map(d => d.total_tokens);
    renderDoughnutChart('chart-department', dLabels, dTokens, ['#10b981', '#6366f1', '#f59e0b']);

    // 4. Chart Sub-Department
    const sLabels = (data.bySubDepartment || []).map(s => s.sub_department);
    const sTokens = (data.bySubDepartment || []).map(s => s.total_tokens);
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
      txTableBody.innerHTML = `<tr><td colspan="8" class="empty-cell">No transactions recorded for ${durationLabel || 'this period'}. Run a simulation in Tab 1 to populate the ledger!</td></tr>`;
      return;
    }

    txTableBody.innerHTML = '';
    txs.forEach(t => {
      const is200 = t.status_code === 200;
      const isGold = t.tier === 'Gold';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${t.timestamp}</td>
        <td><strong style="color: var(--text-main);">${t.app_name}</strong></td>
        <td><span class="badge-pill ${isGold ? 'tier-gold' : 'tier-silver'}">${t.api_product}</span></td>
        <td>${t.department}</td>
        <td>${t.sub_department}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${t.prompt_tokens} / ${t.candidates_tokens} / <strong>${t.total_tokens}</strong></td>
        <td><span class="badge-pill ${is200 ? 'status-200' : 'status-429'}">${t.status_code} ${is200 ? 'OK' : 'Quota Exceeded'}</span></td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${t.latency_ms} ms</td>
      `;
      txTableBody.appendChild(tr);
    });
  }

});

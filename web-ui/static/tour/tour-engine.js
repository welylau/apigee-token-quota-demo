/**
 * Guided Tour engine - welcome chooser, spotlight + coachmark, mission
 * progress, completion detection and "What just happened?" explainer.
 * (Same pattern and look as the Model Armor and Coffee Shop demos.)
 *
 * Integration contract (provided by js/app.js):
 *   window.quotaApp            { selectTier(tier), selectedApp(), setPreset(key), setBurst(n),
 *                                appLabel(name), productLabel(tier), tierOf(name), isRunning() }
 *   window 'quota:ready'       app.js finished wiring (quotaApp available)
 *   window 'quota:runresult'   detail { kind: 'single'|'burst', appName, tier, statusCodes[],
 *                                       any429, totalTokens, error } after each run
 */
import { MISSIONS, archOpen } from './tour-missions.js';

const STORE_KEY = 'quotaTour.v1';
const HIDE_WELCOME_KEY = 'quotaTour.hideWelcome';
const SEEN_KEY = 'quotaTour.seenThisSession';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const resolve = (v, ...args) => (typeof v === 'function' ? v(...args) : v);
const CLOSE_BTN = '<button type="button" class="tour-close" data-act="dismiss" title="Close (Esc)" aria-label="Close tour">×</button>';
const RESULT_CARD = '.response-card';

export class GuidedTour {
  constructor(app) {
    this.app = app;
    this.state = this.load();
    this.hint = '';
    this.mode = 'idle'; // idle | step | explainer | finished
    this.phase = 'ready'; // run steps: ready -> running
    this.build();
    this.bind();

    const params = new URLSearchParams(window.location.search);
    const forced = params.get('tour');
    if (forced === '0') {
      // ?tour=0: never auto-open (screenshots, presenting). The header button still works.
    } else if (forced) {
      const idx = MISSIONS.findIndex((m) => m.id === forced);
      if (idx >= 0) this.start(idx); else this.showWelcome();
    } else if (this.state.active) {
      this.showStep(); // resume an in-progress tour after reload
    } else if (!localStorage.getItem(HIDE_WELCOME_KEY) && !sessionStorage.getItem(SEEN_KEY)) {
      this.showWelcome();
    }
  }

  // ------------------------------------------------------------------ state
  load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return { active: !!s.active, mission: s.mission || 0, step: s.step || 0, completed: s.completed || [] };
    } catch { return { active: false, mission: 0, step: 0, completed: [] }; }
  }
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.state)); } catch { /* storage unavailable */ } }
  get mission() { return MISSIONS[this.state.mission]; }
  get step() { return this.mission?.steps[this.state.step]; }

  // ------------------------------------------------------------------ DOM
  build() {
    const root = document.createElement('div');
    root.className = 'tour-root';
    root.innerHTML = `
      <div class="tour-welcome-backdrop" id="tourWelcome" hidden>
        <div class="tour-welcome" role="dialog" aria-modal="true" aria-labelledby="tourWelcomeTitle">
          <div class="tour-welcome-icon">⚡</div>
          <h2 id="tourWelcomeTitle">Welcome to Apigee LLM Token Quota</h2>
          <p class="tour-welcome-sub">See how Apigee X gives each app its own Gemini token budget, blocks overuse with HTTP 429, and reports who used what</p>
          <div class="tour-choice-grid">
            <button type="button" class="tour-choice selected" data-choice="tour">
              <span class="tour-choice-badge">Recommended</span>
              <span class="tour-choice-icon">🗺️</span>
              <span class="tour-choice-title">Guided Tour</span>
              <span class="tour-choice-meta">${MISSIONS.length} short missions · about 6 min</span>
              <ul class="tour-choice-list">
                <li>How the token quota works</li>
                <li>Relabel the demo for your audience</li>
                <li>Hit the limit and get HTTP 429</li>
                <li>Per-app token analytics</li>
              </ul>
            </button>
            <button type="button" class="tour-choice" data-choice="explore">
              <span class="tour-choice-icon">🧭</span>
              <span class="tour-choice-title">Explore on my own</span>
              <span class="tour-choice-meta">Go straight to the simulator. You can start the tour later from the header.</span>
            </button>
          </div>
          <div class="tour-welcome-footer">
            <label class="tour-check"><input type="checkbox" id="tourHideWelcome"> Don't show this again</label>
            <div class="tour-welcome-actions">
              <button type="button" class="tour-btn tour-btn-text" id="tourResumeBtn" hidden></button>
              <button type="button" class="tour-btn tour-btn-text" id="tourSkipBtn">Skip</button>
              <button type="button" class="tour-btn tour-btn-primary" id="tourStartBtn">Start Guided Tour</button>
            </div>
          </div>
        </div>
      </div>

      <div class="tour-dim" id="tourDim" hidden><i></i><i></i><i></i><i></i></div>
      <div class="tour-spotlight" id="tourSpotlight" hidden></div>

      <div class="tour-stepper" id="tourStepper" hidden>
        <button type="button" class="tour-stepper-list" id="tourChecklistBtn" title="Show all missions">☰ Missions</button>
        <div class="tour-dots" id="tourDots"></div>
        <span class="tour-stepper-label" id="tourStepperLabel"></span>
        <button type="button" class="tour-btn tour-btn-text tour-exit" id="tourExitBtn">Exit tour</button>
      </div>

      <div class="tour-checklist" id="tourChecklist" hidden></div>
      <div class="tour-pop" id="tourPop" role="dialog" aria-live="polite" hidden></div>
      <aside class="tour-explainer" id="tourExplainer" aria-live="polite" hidden></aside>
      <div class="tour-toast" id="tourToast" role="status" hidden></div>
    `;
    document.body.appendChild(root);
    const $ = (id) => root.querySelector(`#${id}`);
    Object.assign(this, {
      root, welcome: $('tourWelcome'), spot: $('tourSpotlight'), dim: $('tourDim'), stepper: $('tourStepper'),
      dots: $('tourDots'), stepperLabel: $('tourStepperLabel'), checklist: $('tourChecklist'),
      pop: $('tourPop'), explainer: $('tourExplainer'), toast: $('tourToast'),
    });

    let choice = 'tour';
    root.querySelectorAll('.tour-choice').forEach((btn) => btn.addEventListener('click', () => {
      choice = btn.dataset.choice;
      root.querySelectorAll('.tour-choice').forEach((b) => b.classList.toggle('selected', b === btn));
      $('tourStartBtn').textContent = choice === 'tour' ? 'Start Guided Tour' : 'Start exploring';
    }));
    const closeWelcome = () => {
      try {
        if ($('tourHideWelcome').checked) localStorage.setItem(HIDE_WELCOME_KEY, '1');
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch { /* storage unavailable */ }
      this.welcome.hidden = true;
    };
    $('tourStartBtn').addEventListener('click', () => {
      closeWelcome();
      if (choice === 'tour') this.start(0, true); else this.exit(false);
    });
    $('tourSkipBtn').addEventListener('click', () => { closeWelcome(); this.exit(false); });
    $('tourResumeBtn').addEventListener('click', () => { closeWelcome(); this.start(this.state.mission); });
    $('tourExitBtn').addEventListener('click', () => this.exit(true));
    $('tourChecklistBtn').addEventListener('click', () => this.toggleChecklist());
  }

  bind() {
    window.addEventListener('quota:runresult', (e) => this.onRunResult(e.detail || {}));
    document.addEventListener('click', (e) => {
      if (this.mode !== 'step') return;
      const s = this.step;
      if (s?.done?.click && e.target.closest(s.done.click)) { setTimeout(() => this.completeStep(), 300); return; }
      // The user pressed the real Send / Burst button during a run step.
      if (s?.kind === 'run' && s.target && e.target.closest(s.target) && !e.target.closest(s.target).disabled) {
        this.phase = 'running';
        this.hint = 'Calling Apigee… watch the response panel and the quota meter.';
        this.renderPop();
        setTimeout(() => this.position(), 50);
      }
    }, true);
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this.checklist.hidden) { this.toggleChecklist(false); e.stopImmediatePropagation(); return; }
      // Let the app close its own layer first (diagram, settings, admin drawer).
      if (archOpen() || this.scenarioOpen() || this.adminOpen() || !this.welcome.hidden) return;
      if (['step', 'explainer', 'finished'].includes(this.mode)) this.dismiss();
    }, true);

    let raf = 0;
    const reflow = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => this.position()); };
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    // Panels resize (splitter, responses, drawers); keep the spotlight glued on.
    setInterval(() => { if (this.mode === 'step') this.position(); }, 300);
  }

  // ------------------------------------------------------------------ helpers
  adminOpen() { return !!document.getElementById('adminDrawer')?.classList.contains('open'); }
  scenarioOpen() { return !!document.getElementById('scenarioModal')?.classList.contains('active'); }
  closeArch() { if (archOpen()) document.getElementById('closeModalBtn')?.click(); }
  closeAdmin() { if (this.adminOpen()) document.getElementById('btnCloseAdminDrawer')?.click(); }
  closeLayers() { this.closeArch(); this.closeAdmin(); }
  showToast(html) {
    this.toast.innerHTML = html;
    this.toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast.hidden = true; }, 5000);
  }

  // ------------------------------------------------------------------ flow
  showWelcome() {
    const resume = this.root.querySelector('#tourResumeBtn');
    const canResume = this.state.completed.length > 0 && this.state.mission < MISSIONS.length;
    resume.hidden = !canResume;
    if (canResume) resume.textContent = `Resume (Mission ${this.state.mission + 1})`;
    this.mode = 'idle';
    this.hideOverlays();
    this.welcome.hidden = false;
  }

  /** Public: (re)open the chooser, e.g. from the header button. */
  open() { this.showWelcome(); }

  start(missionIdx = 0, fresh = false) {
    if (fresh) this.state = { active: true, mission: 0, step: 0, completed: [] };
    this.state.active = true;
    this.state.mission = Math.max(0, Math.min(missionIdx, MISSIONS.length - 1));
    this.state.step = 0;
    this.save();
    this.showStep();
  }

  exit(confirmed) {
    this.state.active = false;
    this.save();
    this.mode = 'idle';
    this.hideOverlays();
    if (confirmed) this.showToast('🗺️ Guided Tour paused. Reopen it any time from <b>Guided Tour</b> in the header.');
  }

  hideOverlays() {
    [this.dim, this.spot, this.stepper, this.checklist, this.pop, this.explainer].forEach((el) => { el.hidden = true; });
  }

  showStep() {
    const s = this.step;
    if (!s) return this.finish();
    this.mode = 'step';
    this.hint = '';
    this.phase = 'ready';
    this.explainer.hidden = true;
    if (s.before) s.before(this);
    this.renderStepper();
    this.renderPop();
    const el = s.target && document.querySelector(s.target);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    setTimeout(() => this.position(), 350);
  }

  completeStep() {
    if (this.mode !== 'step') return;
    const m = this.mission;
    if (this.state.step < m.steps.length - 1) {
      this.state.step += 1;
      this.save();
      return this.showStep();
    }
    if (!this.state.completed.includes(m.id)) this.state.completed.push(m.id);
    this.save();
    this.showExplainer();
  }

  nextMission() {
    this.closeLayers();
    if (this.state.mission >= MISSIONS.length - 1) return this.finish();
    this.state.mission += 1;
    this.state.step = 0;
    this.save();
    this.showStep();
  }

  back() {
    let mi = this.state.mission, si = this.state.step - 1;
    if (si < 0) {
      if (mi === 0) return;
      mi -= 1;
      si = MISSIONS[mi].steps.length - 1;
    }
    this.state.mission = mi;
    this.state.step = si;
    this.save();
    this.showStep();
  }

  finish() {
    this.state.active = false;
    this.state.mission = MISSIONS.length;
    this.save();
    this.hideOverlays();
    this.closeLayers();
    const done = this.state.completed.length;
    this.explainer.innerHTML = `${CLOSE_BTN}
      <div class="tour-exp-head"><span class="tour-exp-kicker">Guided Tour</span><h3>🎉 Tour complete</h3></div>
      <p class="tour-exp-text">You finished <b>${done}</b> of ${MISSIONS.length} missions. You've seen Apigee:</p>
      <ul class="tour-exp-summary">
        <li>Front Gemini on Vertex AI with one API proxy</li>
        <li>Give each API product its own token budget (4K vs 40K per 5 min)</li>
        <li>Count real tokens from Gemini's <code>usageMetadata</code></li>
        <li>Block overuse with HTTP 429 before Gemini is called</li>
        <li>Report token usage by product, app and custom attributes</li>
      </ul>
      <div class="tour-exp-actions">
        <button type="button" class="tour-btn tour-btn-text" data-act="restart">Restart tour</button>
        <button type="button" class="tour-btn tour-btn-primary" data-act="close">Continue exploring</button>
      </div>`;
    this.mode = 'finished';
    this.explainer.classList.remove('tour-explainer-low');
    this.explainer.hidden = false;
    this.explainer.querySelector('[data-act="restart"]').onclick = () => this.start(0, true);
    this.explainer.querySelectorAll('[data-act="close"], [data-act="dismiss"]').forEach((b) => {
      b.onclick = () => { this.explainer.hidden = true; this.mode = 'idle'; };
    });
  }

  // ------------------------------------------------------------------ events
  onRunResult(detail) {
    this.lastRun = detail;
    if (!this.state.active || this.mode !== 'step') return;
    const s = this.step;
    if (s?.kind !== 'run' || !s.done?.run) return;
    if (s.done.run(detail, this)) return setTimeout(() => this.completeStep(), 1200);
    this.phase = 'ready';
    this.hint = resolve(s.onMiss, detail, this) || 'That run did not give the expected result. Try again.';
    this.renderPop();
    this.position();
  }

  // ------------------------------------------------------------------ render
  renderStepper() {
    this.dots.innerHTML = MISSIONS.map((m, i) => {
      const cls = this.state.completed.includes(m.id) ? 'done' : (i === this.state.mission ? 'current' : '');
      return `${i ? '<span class="tour-dot-line"></span>' : ''}<button type="button" class="tour-dot ${cls}" data-idx="${i}" title="${esc(m.title)}">${cls === 'done' ? '✓' : i + 1}</button>`;
    }).join('');
    this.dots.querySelectorAll('.tour-dot').forEach((d) => d.addEventListener('click', () => this.start(Number(d.dataset.idx))));
    this.stepperLabel.textContent = `Guided Tour · Mission ${this.state.mission + 1}/${MISSIONS.length}`;
    const header = document.querySelector('header');
    if (header) this.stepper.style.top = `${Math.round(header.getBoundingClientRect().bottom) + 6}px`;
    this.stepper.hidden = false;
  }

  toggleChecklist(force) {
    const show = force ?? this.checklist.hidden;
    if (!show) { this.checklist.hidden = true; return; }
    const doneCount = this.state.completed.length;
    const pct = Math.round((doneCount / MISSIONS.length) * 100);
    this.checklist.innerHTML = `
      <div class="tour-cl-head">
        <div class="tour-ring" style="--pct:${pct}"><span>${doneCount}/${MISSIONS.length}</span></div>
        <div><div class="tour-cl-title">Mission checklist</div><div class="tour-cl-sub">Click a mission to jump to it</div></div>
      </div>
      <ol class="tour-cl-list">
        ${MISSIONS.map((m, i) => {
          const st = this.state.completed.includes(m.id) ? 'done' : (i === this.state.mission ? 'current' : 'todo');
          return `<li class="${st}" data-idx="${i}"><span class="tour-cl-mark">${st === 'done' ? '✓' : i + 1}</span>
            <span class="tour-cl-name">${esc(m.title)}</span><span class="tour-cl-badge">${esc(m.badge)}</span></li>`;
        }).join('')}
      </ol>`;
    this.checklist.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => {
      this.toggleChecklist(false);
      this.start(Number(li.dataset.idx));
    }));
    this.checklist.hidden = false;
  }

  renderPop() {
    const s = this.step, m = this.mission;
    if (!s) return;
    const multi = m.steps.length > 1;
    const kicker = `MISSION ${this.state.mission + 1} OF ${MISSIONS.length}${multi ? ` · STEP ${this.state.step + 1}/${m.steps.length}` : ''}`;

    let primary = '';
    if (s.kind === 'run' && this.phase === 'running') primary = '<button type="button" class="tour-btn tour-btn-primary" disabled>Running…</button>';
    else if (s.action) primary = `<button type="button" class="tour-btn tour-btn-primary" data-act="action">${esc(resolve(s.action.label, this))}</button>`;

    this.pop.innerHTML = `${CLOSE_BTN}
      <span class="tour-pop-arrow"></span>
      <div class="tour-pop-kicker">${kicker}</div>
      <h3 class="tour-pop-title">${esc(resolve(s.title, this))}</h3>
      <div class="tour-pop-body">${resolve(s.body, this)}</div>
      ${s.expect ? `<div class="tour-expect">Expected: <b>${esc(resolve(s.expect, this))}</b></div>` : ''}
      ${this.hint ? `<div class="tour-hint">${this.hint}</div>` : ''}
      <div class="tour-pop-actions">
        <button type="button" class="tour-btn tour-btn-text" data-act="back" ${this.state.mission === 0 && this.state.step === 0 ? 'disabled' : ''}>Back</button>
        <button type="button" class="tour-btn tour-btn-text" data-act="skip">Skip</button>
        ${primary}
      </div>`;
    this.pop.hidden = false;

    const on = (act, fn) => { const b = this.pop.querySelector(`[data-act="${act}"]`); if (b) b.onclick = fn; };
    on('action', () => s.action.run(this));
    on('skip', () => this.completeStep());
    on('back', () => this.back());
    on('dismiss', () => this.dismiss());
  }

  showExplainer() {
    const m = this.mission, ex = resolve(m.explainer, this) || {};
    this.mode = 'explainer';
    this.spot.hidden = true; this.dim.hidden = true;
    this.pop.hidden = true;
    this.renderStepper();
    const next = MISSIONS[this.state.mission + 1];
    const icon = { ok: '✓', fail: '✕', skip: '–', miss: '!' };
    this.explainer.innerHTML = `${CLOSE_BTN}
      <div class="tour-exp-head"><span class="tour-exp-kicker">What just happened?</span><h3>${esc(ex.title || m.title)}</h3></div>
      <ol class="tour-flow">
        ${(ex.flow || []).map((f, i) => `<li class="${f.state}"><span class="tour-flow-n">${icon[f.state] || i + 1}</span><span class="tour-flow-text">${esc(f.text)}</span>${f.tag ? `<span class="tour-flow-tag">${esc(f.tag)}</span>` : ''}</li>`).join('')}
      </ol>
      ${ex.note ? `<p class="tour-exp-note">${ex.note}</p>` : ''}
      <div class="tour-exp-done">Mission complete!</div>
      <div class="tour-exp-actions">
        <button type="button" class="tour-btn tour-btn-text" data-act="later">Pause</button>
        <button type="button" class="tour-btn tour-btn-primary" data-act="next">${next ? `Next: ${esc(next.title)}` : 'Finish tour'}</button>
      </div>`;
    this.explainer.hidden = false;
    this.explainer.classList.toggle('tour-explainer-low', archOpen());
    const on = (act, fn) => { const b = this.explainer.querySelector(`[data-act="${act}"]`); if (b) b.onclick = fn; };
    on('next', () => { this.explainer.hidden = true; this.nextMission(); });
    on('later', () => this.dismiss());
    on('dismiss', () => this.dismiss());
  }

  /** Close the current tour pop-up (× or Esc). Progress is kept for Resume. */
  dismiss() {
    if (this.mode === 'step') return this.exit(true);
    if (this.mode === 'explainer') {
      this.state.mission = Math.min(this.state.mission + 1, MISSIONS.length - 1);
      this.state.step = 0;
      return this.exit(true);
    }
    if (this.mode === 'finished') { this.explainer.hidden = true; this.mode = 'idle'; }
  }

  // ------------------------------------------------------------------ layout
  position() {
    if (this.mode !== 'step' || this.pop.hidden) return;
    const s = this.step;
    const isVisible = (rect) => rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0
      && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    // While a run is in flight, follow the response card without dimming so the UI stays readable.
    let sel = s?.target;
    let shade = s?.shade !== false;
    if (s?.kind === 'run' && this.phase === 'running') { sel = RESULT_CARD; shade = false; }
    const el = sel ? document.querySelector(sel) : null;
    const r = el?.getBoundingClientRect();
    const visible = isVisible(r);

    const pw = this.pop.offsetWidth, ph = this.pop.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight, gap = 16, pad = 12;
    this.pop.classList.remove('place-right', 'place-left', 'place-bottom', 'place-top', 'place-center');

    if (!visible) {
      this.spot.hidden = true; this.dim.hidden = true;
      this.pop.classList.add('place-center');
      this.pop.style.left = `${(vw - pw) / 2}px`;
      this.pop.style.top = `${Math.max(80, (vh - ph) / 2)}px`;
      return;
    }

    const p = 6;
    // Clip the highlight to the viewport (cards can be taller than the screen).
    const top0 = Math.max(4, r.top - p), bot0 = Math.min(vh - 4, r.bottom + p);
    Object.assign(this.spot.style, { left: `${r.left - p}px`, top: `${top0}px`, width: `${r.width + p * 2}px`, height: `${bot0 - top0}px` });
    this.spot.hidden = false;
    if (!shade) {
      this.dim.hidden = true;
    } else {
      const t = Math.max(0, r.top - p), b = Math.min(vh, r.bottom + p);
      const l = Math.max(0, r.left - p), rt = Math.min(vw, r.right + p);
      const [dTop, dBottom, dLeft, dRight] = this.dim.children;
      Object.assign(dTop.style, { left: '0px', top: '0px', width: `${vw}px`, height: `${t}px` });
      Object.assign(dBottom.style, { left: '0px', top: `${b}px`, width: `${vw}px`, height: `${Math.max(0, vh - b)}px` });
      Object.assign(dLeft.style, { left: '0px', top: `${t}px`, width: `${l}px`, height: `${Math.max(0, b - t)}px` });
      Object.assign(dRight.style, { left: `${rt}px`, top: `${t}px`, width: `${Math.max(0, vw - rt)}px`, height: `${Math.max(0, b - t)}px` });
      this.dim.hidden = false;
    }

    const a = { left: r.left, right: r.right, top: Math.max(r.top, 0), bottom: Math.min(r.bottom, vh) };
    a.height = a.bottom - a.top; a.width = r.width;
    let place, left, top;
    if (a.right + gap + pw < vw - pad) { place = 'right'; left = a.right + gap; top = a.top + a.height / 2 - ph / 2; }
    else if (a.left - gap - pw > pad) { place = 'left'; left = a.left - gap - pw; top = a.top + a.height / 2 - ph / 2; }
    else if (a.bottom + gap + ph < vh - pad) { place = 'bottom'; top = a.bottom + gap; left = a.left + a.width / 2 - pw / 2; }
    else { place = 'top'; top = a.top - gap - ph; left = a.left + a.width / 2 - pw / 2; }

    left = Math.max(pad, Math.min(left, vw - pw - pad));
    top = Math.max(pad, Math.min(top, vh - ph - pad));
    this.pop.classList.add(`place-${place}`);
    this.pop.style.left = `${left}px`;
    this.pop.style.top = `${top}px`;
    const arrow = this.pop.querySelector('.tour-pop-arrow');
    if (arrow) {
      if (place === 'right' || place === 'left') {
        arrow.style.top = `${Math.max(16, Math.min(ph - 16, a.top + a.height / 2 - top))}px`; arrow.style.left = '';
      } else {
        arrow.style.left = `${Math.max(16, Math.min(pw - 16, a.left + a.width / 2 - left))}px`; arrow.style.top = '';
      }
    }
  }
}

// Bootstrap once app.js has exposed window.quotaApp.
function boot() {
  if (window.quotaTour || !window.quotaApp) return;
  window.quotaTour = new GuidedTour(window.quotaApp);
  document.getElementById('headerTourBtn')?.addEventListener('click', () => window.quotaTour.open());
}
if (window.quotaApp) boot(); else window.addEventListener('quota:ready', boot, { once: true });

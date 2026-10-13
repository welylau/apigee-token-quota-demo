/**
 * Guided Tour - mission definitions (Apigee X LLM Token Quota demo).
 *
 * Purely declarative: tour-engine.js renders and sequences these. Each mission
 * is a list of steps; a mission is complete when its last step completes.
 *
 * Step fields
 *   kind        'action' | 'run'
 *   title/body  coachmark copy (string or fn(engine); body is trusted, authored HTML)
 *   target      CSS selector for the spotlight ('run' steps: the Send / Burst button)
 *   shade       false = highlight without dimming the rest of the page
 *   action      { label, run(engine) } primary button
 *   before(engine)  optional setup when the step is shown
 *   expect      short "Expected:" line
 *   done        { click: selector } | { run: fn(detail, engine) -> bool }  (detail from 'quota:runresult')
 *   onMiss      fn(detail, engine) -> hint HTML when a run does not satisfy done.run
 *
 * Labels (products, apps) follow the active ⚙️ Settings scenario via engine.app.
 */

export const archOpen = () => !!document.getElementById('archModal')?.classList.contains('active');

const lowTier = (e) => e.app.productLabel('Silver');
const highTier = (e) => e.app.productLabel('Gold');
const current = (e) => e.app.appLabel(e.app.selectedApp());
const click = (sel) => document.querySelector(sel)?.click();

export const MISSIONS = [
  // ---------------------------------------------------------------- 1
  {
    id: 'architecture',
    title: 'Meet the architecture',
    badge: 'Overview',
    steps: [{
      kind: 'action',
      title: 'Meet the architecture',
      target: '#viewArchBtn',
      body: `Every prompt to Gemini goes through <b>Apigee X</b> first. One API proxy does three jobs:
        <ul>
          <li><b>Identify</b> the app from its <code>x-api-key</code></li>
          <li><b>Enforce</b> a token budget with <code>LLMTokenQuota</code></li>
          <li><b>Record</b> token usage for analytics</li>
        </ul>`,
      action: { label: 'Open the diagram', run: () => click('#viewArchBtn') },
      done: { click: '#viewArchBtn' },
    }],
    explainer: {
      title: 'The request path',
      flow: [
        { text: 'The app calls the Apigee proxy with its API key', state: 'ok', tag: 'VerifyAPIKey' },
        { text: 'Apigee checks the remaining token budget for that app', state: 'ok', tag: 'Enforce' },
        { text: 'Gemini 3.5 Flash Lite answers on Vertex AI (global endpoint)', state: 'ok' },
        { text: 'Apigee subtracts the real token count from the budget', state: 'ok', tag: 'Count' },
        { text: 'Tokens and custom attributes are sent to Apigee Analytics', state: 'ok', tag: 'Telemetry' },
      ],
      note: 'Budgets are set on the <b>API products</b>: 4,000 or 40,000 tokens per 5 minutes. You can reopen the diagram any time from <b>View Architecture Diagram</b>.',
    },
  },

  // ---------------------------------------------------------------- 2
  {
    id: 'scenario',
    title: 'Pick a scenario',
    badge: 'Settings',
    steps: [
      {
        kind: 'action',
        title: 'Tell your audience’s story',
        target: '#btnOpenScenarioSettings',
        body: `The same two API products and four apps can tell different stories:
          an engineering team, SaaS plans, bank staff, a university and more.
          <br><br>Settings only change the <b>labels on screen</b>. The Apigee setup and the quotas stay the same.`,
        action: { label: 'Open Settings', run: () => click('#btnOpenScenarioSettings') },
        done: { click: '#btnOpenScenarioSettings' },
      },
      {
        kind: 'action',
        title: 'Choose a preset',
        target: '#btnApplyScenario',
        shade: false,
        before: (e) => { if (!e.scenarioOpen()) click('#btnOpenScenarioSettings'); },
        body: `Pick any preset card, or type your own names under <b>Custom</b>.
          Then press <b>Apply scenario</b>.`,
        action: { label: 'Apply current choice', run: () => click('#btnApplyScenario') },
        done: { click: '#btnApplyScenario' },
      },
    ],
    explainer: (e) => ({
      title: 'Same gateway, new story',
      flow: [
        { text: `Lower tier is now shown as “${lowTier(e)}” (4K tokens / 5 min)`, state: 'ok' },
        { text: `Higher tier is now shown as “${highTier(e)}” (40K tokens / 5 min)`, state: 'ok' },
        { text: 'App names, custom attribute labels and sample prompts were updated', state: 'ok' },
        { text: 'Apigee API products and developer apps did not change', state: 'skip' },
      ],
      note: 'Use <b>Reset to original</b> in Settings to go back to the default labels.',
    }),
  },

  // ---------------------------------------------------------------- 3
  {
    id: 'single',
    title: 'Send a prompt',
    badge: '200',
    steps: [
      {
        kind: 'action',
        title: 'Pick a profile',
        target: '#apps-grid',
        body: (e) => `Each card is an Apigee <b>developer app</b> with its own API key.
          The top two use <b>${lowTier(e)}</b> (4K tokens / 5 min). The bottom two use <b>${highTier(e)}</b> (40K).
          <br><br>Click a card, or let the tour pick a ${lowTier(e)} profile for you.`,
        action: {
          label: (e) => `Pick a ${lowTier(e)} profile`,
          run: (e) => { e.app.selectTier('Silver'); e.completeStep(); },
        },
        done: { click: '.app-card' },
      },
      {
        kind: 'run',
        title: 'Send one request',
        target: '#send-single-btn',
        before: (e) => e.app.setPreset('light'),
        body: (e) => `The <b>Light Query</b> prompt is loaded for <b>${current(e)}</b>.
          Send it and watch two things:
          <ul>
            <li>the token counts in <b>Gateway Response</b></li>
            <li>the quota meter on the left going up</li>
          </ul>`,
        expect: '200 OK and a small token debit',
        action: { label: 'Send ⚡', run: () => click('#send-single-btn') },
        done: { run: (d) => d.kind === 'single' && d.statusCodes.length > 0 },
        onMiss: () => 'Use <b>Send Single Request</b> for this step.',
      },
    ],
    explainer: (e) => {
      const d = e.lastRun || {};
      const ok = d.statusCodes?.[0] === 200;
      return {
        title: ok ? 'Real tokens, debited per app' : 'This profile was already out of tokens',
        flow: [
          { text: `Apigee identified ${e.app.appLabel(d.appName || e.app.selectedApp())} from its API key`, state: 'ok' },
          { text: ok ? 'Budget check passed' : 'Budget already used up, so Apigee returned 429', state: ok ? 'ok' : 'fail', tag: ok ? 'Enforce' : '429' },
          { text: ok ? `Gemini answered: ${(d.totalTokens || 0).toLocaleString()} tokens in total` : 'Gemini was not called', state: ok ? 'ok' : 'skip' },
          { text: ok ? 'LLMTokenQuota subtracted those tokens from the 5-minute budget' : 'No tokens were charged for the blocked call', state: ok ? 'ok' : 'skip', tag: ok ? 'Count' : '' },
        ],
        note: 'Apigee counts the <code>totalTokenCount</code> that Gemini returns, so long answers cost more than short ones.',
      };
    },
  },

  // ---------------------------------------------------------------- 4
  {
    id: 'limit',
    title: 'Hit the limit',
    badge: '429',
    steps: [{
      kind: 'run',
      title: 'Burn through the budget',
      target: '#simulate-burst-btn',
      before: (e) => { e.app.selectTier('Silver'); e.app.setPreset('heavy'); e.app.setBurst(5); },
      body: (e) => `<b>${current(e)}</b> (${lowTier(e)}, 4K tokens) is selected with the
        <b>Heavy Quota Burner</b> prompt and a burst of 5 calls.
        <br><br>Each answer uses 1,500 to 2,500 tokens, so the budget runs out after 2 or 3 calls.`,
      expect: 'A few 200s, then HTTP 429',
      action: { label: 'Run burst 💥', run: () => click('#simulate-burst-btn') },
      done: { run: (d) => d.any429 },
      onMiss: () => 'All calls passed because there was still budget left in this 5-minute window. Run the burst again.',
    }],
    explainer: (e) => {
      const d = e.lastRun || {};
      const codes = d.statusCodes || [];
      const ok = codes.filter((c) => c === 200).length;
      return {
        title: 'Quota exceeded: HTTP 429',
        flow: [
          { text: `${ok} call${ok === 1 ? '' : 's'} passed and used the budget`, state: 'ok', tag: '200' },
          { text: `Call #${codes.indexOf(429) + 1} found the budget used up`, state: 'fail', tag: '429' },
          { text: 'Apigee returned 429 RESOURCE_EXHAUSTED right away', state: 'fail', tag: 'Enforce' },
          { text: 'Gemini was never called, so no tokens were spent', state: 'skip' },
        ],
        note: 'The budget refills when the 5-minute window rolls over. Other apps are not affected.',
      };
    },
  },

  // ---------------------------------------------------------------- 5
  {
    id: 'tiers',
    title: 'Compare tiers',
    badge: '40K',
    steps: [{
      kind: 'run',
      title: 'Same burst, bigger budget',
      target: '#simulate-burst-btn',
      before: (e) => { e.app.selectTier('Gold'); e.app.setPreset('heavy'); e.app.setBurst(3); },
      body: (e) => `Now <b>${current(e)}</b> on <b>${highTier(e)}</b> is selected: 40,000 tokens per 5 minutes.
        <br><br>Run the same heavy prompt as a burst of 3 calls.`,
      expect: 'All calls return 200',
      action: { label: 'Run burst 💥', run: () => click('#simulate-burst-btn') },
      done: { run: (d) => d.kind === 'burst' && !d.any429 && d.statusCodes.length > 0 },
      onMiss: (d) => (d.any429
        ? 'This profile used up its budget in earlier runs. Pick the other higher-tier profile and run the burst again.'
        : 'Use <b>Simulate Burst</b> for this step.'),
    }],
    explainer: (e) => ({
      title: 'The API product sets the budget',
      flow: [
        { text: `${lowTier(e)}: 4,000 tokens / 5 min, blocked after a few heavy calls`, state: 'fail', tag: '429' },
        { text: `${highTier(e)}: 40,000 tokens / 5 min, every heavy call passed`, state: 'ok', tag: '200' },
        { text: 'Same proxy, same policies. Only the API product is different.', state: 'ok' },
      ],
      note: 'To move an app to a bigger budget, add it to a different API product. No proxy change is needed.',
    }),
  },

  // ---------------------------------------------------------------- 6
  {
    id: 'analytics',
    title: 'See the analytics',
    badge: 'Analytics',
    steps: [
      {
        kind: 'action',
        title: 'Open Admin Analytic',
        target: '#btnOpenAdminDrawer',
        body: 'Every call you just made was recorded by the <code>DC-AiTelemetry</code> policy. Let’s look at it.',
        action: { label: 'Open Admin Analytic', run: () => click('#btnOpenAdminDrawer') },
        done: { click: '#btnOpenAdminDrawer, #floatingAdminTrigger' },
      },
      {
        kind: 'action',
        title: 'Two views of the same data',
        target: '.admin-drawer-tabs',
        before: (e) => { if (!e.adminOpen()) click('#btnOpenAdminDrawer'); },
        body: `<b>Aggregated</b> shows totals by API product, app and custom attributes, plus the 429 count.
          <br><br><b>App-Specific</b> zooms in on one app: calls, tokens and its live 5-minute quota.`,
        action: {
          label: 'Show App-Specific',
          run: () => click('.admin-tab-btn[data-admin-tab="app-specific"]'),
        },
        done: { click: '.admin-tab-btn[data-admin-tab="app-specific"]' },
      },
    ],
    explainer: {
      title: 'Who used how many tokens',
      flow: [
        { text: 'Token counts were captured on every call', state: 'ok', tag: 'Telemetry' },
        { text: 'Custom attributes on each app let you group usage by team or department', state: 'ok' },
        { text: 'Blocked calls show up as quota violations (429s)', state: 'ok' },
      ],
      note: 'Use this for showback or chargeback: each team sees its own Gemini token usage.',
    },
  },
];

/**
 * Scenario Presets for the Apigee LLM Token Quota Demo.
 *
 * Presets are a DISPLAY-ONLY relabeling layer. The real Apigee entities
 * (API Products, Developer Apps, API keys, and quota limits) never change;
 * each preset simply maps those fixed slots to audience-friendly names.
 *
 * Fixed slots:
 *   Products : Silver (Gemini-Silver-Tier, 4K tokens / 5 min)
 *              Gold   (Gemini-Gold-Tier,  40K tokens / 5 min)
 *   Apps     : 2 x Silver apps, 2 x Gold apps (keys below)
 *   Attrs    : attr1 -> custom attribute "Department"     (dc_department)
 *              attr2 -> custom attribute "Sub Department" (dc_sub_department)
 */
(function () {
  'use strict';

  const APP_KEYS = [
    'Gemini-Basic-Mfg-SmartTV-App',
    'Gemini-Basic-Mfg-AudioSignal-App',
    'Gemini-Premium-Network-Core-App',
    'Gemini-Premium-Network-Wireless-App'
  ];

  const APP_TIERS = {
    'Gemini-Basic-Mfg-SmartTV-App': 'Silver',
    'Gemini-Basic-Mfg-AudioSignal-App': 'Silver',
    'Gemini-Premium-Network-Core-App': 'Gold',
    'Gemini-Premium-Network-Wireless-App': 'Gold'
  };

  const PRODUCT_REAL_NAMES = {
    Silver: 'Gemini-Silver-Tier',
    Gold: 'Gemini-Gold-Tier'
  };

  const LIMITS = {
    MAX_LABEL: 40,
    MAX_ICON: 16,
    MAX_DESC: 120,
    MAX_PROMPT: 2000
  };

  const PRESETS = {
    engineering: {
      id: 'engineering',
      name: 'Engineering Team',
      icon: '👩‍💻',
      story: 'Every engineer gets a personal Gemini token budget. Senior engineers get 10× more.',
      appSectionTitle: 'Select Engineer Profile',
      products: {
        Silver: { label: 'Engineer', icon: '🛠️' },
        Gold: { label: 'Senior Engineer', icon: '🏅' }
      },
      attrLabels: { attr1: 'Team', attr2: 'Squad' },
      apps: {
        'Gemini-Basic-Mfg-SmartTV-App': { name: 'Ethan', icon: '👨‍💻', attr1: 'Product Engineering', attr2: 'Web Frontend', description: 'Frontend engineer using Gemini for code review & UI scaffolding' },
        'Gemini-Basic-Mfg-AudioSignal-App': { name: 'Joshua', icon: '🧑‍💻', attr1: 'Product Engineering', attr2: 'Mobile', description: 'Mobile engineer using Gemini for test generation & debugging' },
        'Gemini-Premium-Network-Core-App': { name: 'Mike', icon: '👨‍🔬', attr1: 'Platform Engineering', attr2: 'Infrastructure', description: 'Senior platform engineer automating infra design reviews' },
        'Gemini-Premium-Network-Wireless-App': { name: 'Ken', icon: '🧑‍🚀', attr1: 'Platform Engineering', attr2: 'Data & ML', description: 'Senior data engineer building ML pipelines with Gemini' }
      },
      prompts: {
        light: 'In one sentence, what is a race condition?',
        medium: 'Review this approach in 2 short bullet points: caching user sessions in Redis with a 30-minute TTL behind an Apigee gateway.',
        heavy: 'Write a detailed, comprehensive 500-word design document for migrating a monolithic Java application to microservices on Google Kubernetes Engine, covering service boundaries, data migration, CI/CD pipelines, observability, security, and a rollback strategy.'
      }
    },

    saas: {
      id: 'saas',
      name: 'SaaS Customer Plans',
      icon: '💳',
      story: 'Sell an AI feature to customers: Free plan gets a small token allowance, Enterprise gets a large one.',
      appSectionTitle: 'Select Customer Profile',
      products: {
        Silver: { label: 'Free Plan', icon: '🆓' },
        Gold: { label: 'Enterprise Plan', icon: '💎' }
      },
      attrLabels: { attr1: 'Industry', attr2: 'Region' },
      apps: {
        'Gemini-Basic-Mfg-SmartTV-App': { name: 'Acme Startup', icon: '🚀', attr1: 'Technology', attr2: 'Singapore', description: 'Early-stage startup trialing the AI assistant on the Free plan' },
        'Gemini-Basic-Mfg-AudioSignal-App': { name: 'Bluebird Studio', icon: '🎬', attr1: 'Media', attr2: 'Malaysia', description: 'Creative studio generating scripts on the Free plan' },
        'Gemini-Premium-Network-Core-App': { name: 'Contoso Bank', icon: '🏦', attr1: 'Financial Services', attr2: 'Hong Kong', description: 'Enterprise bank summarizing customer cases at scale' },
        'Gemini-Premium-Network-Wireless-App': { name: 'Globex Retail', icon: '🛒', attr1: 'Retail', attr2: 'Australia', description: 'Enterprise retailer powering product Q&A for shoppers' }
      },
      prompts: {
        light: 'In one sentence, what is a product recommendation engine?',
        medium: 'Summarize this customer support history in 2 short bullet points: 3 login failures, 1 billing dispute, and 2 feature requests in the last 30 days.',
        heavy: 'Write a detailed, comprehensive 500-word quarterly business review for an enterprise SaaS customer, covering usage trends, return on investment achieved, adoption gaps, support ticket history, renewal risks, and a recommended expansion plan for the next two quarters.'
      }
    },

    banking: {
      id: 'banking',
      name: 'Banking Staff',
      icon: '🏦',
      story: 'Bankers use a Gemini assistant for client work. Private Bankers serving high-net-worth clients get 10× more tokens.',
      appSectionTitle: 'Select Banker Profile',
      products: {
        Silver: { label: 'Relationship Manager', icon: '💼' },
        Gold: { label: 'Private Banker', icon: '👑' }
      },
      attrLabels: { attr1: 'Branch', attr2: 'Customer Segment' },
      apps: {
        'Gemini-Basic-Mfg-SmartTV-App': { name: 'Sarah', icon: '👩‍💼', attr1: 'Orchard Branch', attr2: 'Mass Affluent', description: 'Relationship manager preparing client meeting notes' },
        'Gemini-Basic-Mfg-AudioSignal-App': { name: 'David', icon: '👨‍💼', attr1: 'Central Branch', attr2: 'SME Banking', description: 'Relationship manager drafting SME loan summaries' },
        'Gemini-Premium-Network-Core-App': { name: 'Grace', icon: '🧑‍💼', attr1: 'Marina Bay Private Office', attr2: 'Ultra High Net Worth', description: 'Private banker building bespoke wealth proposals' },
        'Gemini-Premium-Network-Wireless-App': { name: 'Daniel', icon: '🕴️', attr1: 'Hong Kong Private Office', attr2: 'High Net Worth', description: 'Private banker producing portfolio reviews & market briefs' }
      },
      prompts: {
        light: 'In one sentence, what is a fixed deposit?',
        medium: "Summarize in 2 short bullet points this client's portfolio: 60% equities, 30% bonds, 10% cash, with a moderate risk appetite.",
        heavy: 'Write a detailed, comprehensive 500-word wealth planning proposal for a high-net-worth client approaching retirement, covering asset allocation, risk management, tax efficiency, estate planning, liquidity needs, and a quarterly review plan.'
      }
    },

    university: {
      id: 'university',
      name: 'University',
      icon: '🎓',
      story: 'Students and professors share a campus Gemini service. Professors get 10× more tokens for research and course design.',
      appSectionTitle: 'Select Student / Professor Profile',
      products: {
        Silver: { label: 'Student', icon: '📚' },
        Gold: { label: 'Professor', icon: '🎓' }
      },
      attrLabels: { attr1: 'Faculty', attr2: 'Course' },
      apps: {
        'Gemini-Basic-Mfg-SmartTV-App': { name: 'Alice', icon: '👩‍🎓', attr1: 'Engineering', attr2: 'Data Structures', description: 'Undergraduate student getting help with coding assignments' },
        'Gemini-Basic-Mfg-AudioSignal-App': { name: 'Ben', icon: '👨‍🎓', attr1: 'Business School', attr2: 'Marketing 101', description: 'Undergraduate student brainstorming case-study answers' },
        'Gemini-Premium-Network-Core-App': { name: 'Dr. Chen', icon: '👩‍🏫', attr1: 'Science', attr2: 'Molecular Biology', description: 'Professor summarizing research papers & grant drafts' },
        'Gemini-Premium-Network-Wireless-App': { name: 'Prof. Davis', icon: '👨‍🏫', attr1: 'Arts & Humanities', attr2: 'Modern History', description: 'Professor designing lectures & assessment rubrics' }
      },
      prompts: {
        light: 'In one sentence, explain photosynthesis.',
        medium: 'Give 2 short bullet points of feedback on this thesis statement: social media has improved political participation among young adults.',
        heavy: 'Write a detailed, comprehensive 500-word literature review on the impact of generative AI on higher education, covering teaching practices, assessment integrity, student learning outcomes, accessibility, faculty workload, and recommendations for university policy.'
      }
    },

    classic: {
      id: 'classic',
      name: 'High Tech Manufacturing Department',
      icon: '📡',
      story: 'The original high tech manufacturing & network scenario with Silver / Gold tiers.',
      appSectionTitle: 'Select Consumer Application Profile',
      products: {
        Silver: { label: 'Silver', icon: '📺' },
        Gold: { label: 'Gold', icon: '👑' }
      },
      attrLabels: { attr1: 'Department', attr2: 'Sub-Department' },
      apps: {
        'Gemini-Basic-Mfg-SmartTV-App': { name: 'Smart TV App', icon: '📺', attr1: 'Manufacturing', attr2: 'Smart TV division', description: 'Smart TV embedded firmware client (Basic Tier)' },
        'Gemini-Basic-Mfg-AudioSignal-App': { name: 'Audio Signal App', icon: '📺', attr1: 'Manufacturing', attr2: 'AudioSignal division', description: 'Audio signal DSP processing client (Basic Tier)' },
        'Gemini-Premium-Network-Core-App': { name: 'Network Core App', icon: '👑', attr1: 'Network', attr2: 'Core division', description: 'Core 5G routing & network automation (Premium Tier)' },
        'Gemini-Premium-Network-Wireless-App': { name: 'Network Wireless App', icon: '👑', attr1: 'Network', attr2: 'Wireless division', description: 'RAN Wireless access network optimizer (Premium Tier)' }
      },
      prompts: {
        light: 'Write a 1-sentence definition of API quota.',
        medium: 'Summarize how Apigee secures Gemini AI APIs in 2 short bullet points.',
        heavy: 'Write a detailed, comprehensive 500-word essay explaining the history of telecommunications and television broadcasting from 1920 to 2026.'
      }
    }
  };

  const PRESET_ORDER = ['engineering', 'saas', 'banking', 'university', 'classic'];
  const DEFAULT_PRESET_ID = 'engineering';
  const ORIGINAL_PRESET_ID = 'classic';
  const STORAGE_KEY = 'apigee_demo_scenario_v1';

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function cleanStr(value, maxLen, fallback) {
    if (typeof value !== 'string') return fallback;
    // Strip control characters, trim, and cap length.
    const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
    if (!cleaned) return fallback;
    return Array.from(cleaned).slice(0, maxLen).join('');
  }

  function cleanPrompt(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (!cleaned) return fallback;
    return cleaned.slice(0, LIMITS.MAX_PROMPT);
  }

  /**
   * Validates and normalizes an arbitrary (possibly user-edited or tampered)
   * scenario config, falling back to the given base preset for any bad field.
   */
  function normalizeConfig(raw, baseId) {
    const base = PRESETS[baseId] || PRESETS[DEFAULT_PRESET_ID];
    const src = (raw && typeof raw === 'object') ? raw : {};
    const out = {
      id: (typeof src.id === 'string' && (PRESETS[src.id] || src.id === 'custom')) ? src.id : base.id,
      name: cleanStr(src.name, LIMITS.MAX_LABEL, base.name),
      icon: cleanStr(src.icon, LIMITS.MAX_ICON, base.icon),
      story: cleanStr(src.story, 200, base.story),
      appSectionTitle: cleanStr(src.appSectionTitle, LIMITS.MAX_LABEL, base.appSectionTitle),
      products: {},
      attrLabels: {},
      apps: {},
      prompts: {}
    };

    ['Silver', 'Gold'].forEach(tier => {
      const p = (src.products && src.products[tier]) || {};
      out.products[tier] = {
        label: cleanStr(p.label, LIMITS.MAX_LABEL, base.products[tier].label),
        icon: cleanStr(p.icon, LIMITS.MAX_ICON, base.products[tier].icon)
      };
    });

    ['attr1', 'attr2'].forEach(k => {
      const v = src.attrLabels ? src.attrLabels[k] : undefined;
      out.attrLabels[k] = cleanStr(v, LIMITS.MAX_LABEL, base.attrLabels[k]);
    });

    APP_KEYS.forEach(key => {
      const a = (src.apps && src.apps[key]) || {};
      const b = base.apps[key];
      out.apps[key] = {
        name: cleanStr(a.name, LIMITS.MAX_LABEL, b.name),
        icon: cleanStr(a.icon, LIMITS.MAX_ICON, b.icon),
        attr1: cleanStr(a.attr1, LIMITS.MAX_LABEL, b.attr1),
        attr2: cleanStr(a.attr2, LIMITS.MAX_LABEL, b.attr2),
        description: cleanStr(a.description, LIMITS.MAX_DESC, b.description)
      };
    });

    ['light', 'medium', 'heavy'].forEach(k => {
      const v = src.prompts ? src.prompts[k] : undefined;
      out.prompts[k] = cleanPrompt(v, base.prompts[k]);
    });

    return out;
  }

  function getPreset(id) {
    return PRESETS[id] ? deepClone(PRESETS[id]) : null;
  }

  function loadActive() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return getPreset(DEFAULT_PRESET_ID);
      const parsed = JSON.parse(stored);
      const baseId = (parsed && PRESETS[parsed.baseId]) ? parsed.baseId : DEFAULT_PRESET_ID;
      if (!parsed || parsed.id !== 'custom') {
        // Built-in preset: always use the latest shipped values. Unknown or
        // retired preset ids fall back to the default preset.
        return getPreset(PRESETS[parsed && parsed.id] ? parsed.id : DEFAULT_PRESET_ID);
      }
      const cfg = normalizeConfig(parsed, baseId);
      cfg.id = 'custom';
      cfg.baseId = baseId;
      return cfg;
    } catch (e) {
      console.warn('Failed to load scenario preset, using default:', e);
      return getPreset(DEFAULT_PRESET_ID);
    }
  }

  function saveActive(cfg) {
    try {
      if (cfg && PRESETS[cfg.id]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: cfg.id }));
      } else {
        const baseId = (cfg && PRESETS[cfg.baseId]) ? cfg.baseId : DEFAULT_PRESET_ID;
        const normalized = normalizeConfig(cfg, baseId);
        normalized.id = 'custom';
        normalized.baseId = baseId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (e) {
      console.warn('Failed to save scenario preset:', e);
    }
  }

  window.ScenarioPresets = {
    APP_KEYS,
    APP_TIERS,
    PRODUCT_REAL_NAMES,
    LIMITS,
    PRESETS,
    PRESET_ORDER,
    DEFAULT_PRESET_ID,
    ORIGINAL_PRESET_ID,
    getPreset,
    normalizeConfig,
    loadActive,
    saveActive
  };
})();

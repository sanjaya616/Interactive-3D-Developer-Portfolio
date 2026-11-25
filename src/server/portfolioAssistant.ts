import {
  DEVELOPER_PROFILE,
  JOURNEY_MILESTONES,
  NAVIGATION_ROUTES,
  PORTFOLIO_PROJECTS,
  SERVICES_LIST,
  SKILL_CATEGORIES,
  SKILLS_CATALOG,
  WORLD_LANDMARKS,
} from '../data/portfolioData.ts';

export const ASSISTANT_MODEL = 'gemini-4-hydrogen';
export const MAX_USER_MESSAGE_CHARS = 500;
export const MAX_HISTORY_TURNS = 8;

export const ASSISTANT_SUGGESTED_QUESTIONS: string[] = [
  'Who is Sanjaya?',
  'What projects has he developed?',
  'What technologies does he use?',
  'Tell me about the SmartMove project.',
  'How can I contact him?',
  'Where can I find the projects building?',
];

export interface AssistantHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AssistantNavSuggestion {
  label: string;
  route: string;
  landmarkId?: string;
}

export interface ValidatedAssistantPayload {
  message: string;
  history: AssistantHistoryTurn[];
  currentRoute: string;
  currentZone: string;
}

function formatWorldDirection(x: number, z: number): string {
  const ns = z < -12 ? 'North' : z > 12 ? 'South' : '';
  const ew = x < -12 ? 'West' : x > 12 ? 'East' : '';
  const dir = [ns, ew].filter(Boolean).join('-') || 'Center';
  return `${dir} (${x}, ${z})`;
}

export function buildVerifiedPortfolioContext(): string {
  const profileSection = [
    `NAME: ${DEVELOPER_PROFILE.name}`,
    `ROLE: ${DEVELOPER_PROFILE.role}`,
    `INSTITUTION: ${DEVELOPER_PROFILE.institution} (${DEVELOPER_PROFILE.educationPeriod})`,
    `FREELANCE EXPERIENCE: ${DEVELOPER_PROFILE.freelancePeriod} — ${DEVELOPER_PROFILE.freelanceSummary}`,
    `LOCATION: ${DEVELOPER_PROFILE.location}`,
    `LANGUAGES: ${DEVELOPER_PROFILE.languages.join(', ')}`,
    `INTERESTS: ${DEVELOPER_PROFILE.personalInterests.join(', ')}`,
    `BIOGRAPHY:\n${DEVELOPER_PROFILE.bio.map((p) => `- ${p}`).join('\n')}`,
    `VERIFIED CONTACT DETAILS:`,
    `- Email: ${DEVELOPER_PROFILE.email}`,
    `- Phone: ${DEVELOPER_PROFILE.phone}`,
    `- GitHub: ${DEVELOPER_PROFILE.githubUrl}`,
    `- LinkedIn: ${DEVELOPER_PROFILE.linkedinUrl}`,
  ].join('\n');

  const projectsSection = PORTFOLIO_PROJECTS.map((p) => {
    const impl = p.implementedFeatures.join(', ');
    const plan = p.plannedFeatures.length > 0 ? p.plannedFeatures.join(', ') : 'None listed';
    return [
      `${p.number}. ${p.title} [Slug: ${p.slug}] (${p.category} · Status: ${p.status})`,
      `   Summary: ${p.description}`,
      `   Contribution: ${p.contribution}`,
      `   Technologies: ${p.technologies.join(', ')}`,
      `   Implemented features: ${impl}`,
      `   Planned features: ${plan}`,
      `   Project-specific URLs: Not published/attached in portfolio yet.`,
    ].join('\n');
  }).join('\n\n');

  const skillsSection = SKILL_CATEGORIES.map((cat) => {
    const items = SKILLS_CATALOG.filter((s) => s.category === cat).map((s) => s.name);
    return `- ${cat} (${items.length}): ${items.join(', ')}`;
  }).join('\n');

  const journeySection = JOURNEY_MILESTONES.map(
    (m) =>
      `- ${m.title} | ${m.organization} | Period: ${m.period} (${m.statusLabel}) | ${m.location}: ${m.description}`,
  ).join('\n');

  const servicesSection = SERVICES_LIST.map(
    (s) =>
      `${s.number}. ${s.title} (${s.tier}): ${s.description} Technologies: ${s.technologies.join(', ')}.`,
  ).join('\n');

  const worldSection = WORLD_LANDMARKS.map(
    (l) =>
      `- ${l.title} (${l.subtitle}) — Direction from Starting Plaza (0,0): ${formatWorldDirection(
        l.position.x,
        l.position.z,
      )} | Route: ${l.route} | Details: ${l.summary}`,
  ).join('\n');

  const routesSection = NAVIGATION_ROUTES.map((r) => `- ${r.label}: ${r.path}`).join('\n');

  return [
    '=== 1. VERIFIED PERSONAL PROFILE & CONTACT ===',
    profileSection,
    '',
    `=== 2. VERIFIED PORTFOLIO PROJECTS (${PORTFOLIO_PROJECTS.length} TOTAL) ===`,
    projectsSection,
    '',
    `=== 3. VERIFIED SKILLS CATALOG (${SKILLS_CATALOG.length} SKILLS ACROSS 5 CATEGORIES) ===`,
    skillsSection,
    '',
    '=== 4. VERIFIED EDUCATION & JOURNEY MILESTONES ===',
    journeySection,
    '',
    '=== 5. VERIFIED SERVICES & EXPLORATORY AREAS ===',
    servicesSection,
    '',
    '=== 6. 3D WORLD DESTINATIONS & NAVIGATION (9 LANDMARKS) ===',
    'Note on 3D coordinates: Starting Plaza is at (0, 0). -Z is North, +Z is South, -X is West, +X is East. Players can also open the World Map (press M) to navigate or fast-drive to any landmark.',
    worldSection,
    '',
    '=== 7. CLASSIC PORTFOLIO ROUTES ===',
    routesSection,
  ].join('\n');
}

export const ASSISTANT_SYSTEM_INSTRUCTION = `You are the official AI Portfolio Guide inside "Sanjaya's World", the interactive 3D developer portfolio of Sanjaya Lakshan.

STRICT GROUNDING & HONESTY RULES (NON-NEGOTIABLE):
1. Answer questions ONLY using the VERIFIED PORTFOLIO DATA provided below.
2. NEVER invent, guess, extrapolate, or fabricate any facts—including client names, employer names, company names, awards, GPA, O/L or A/L examination years, salary, certifications, extra tools, or project-specific live/GitHub URLs not listed below.
3. If the visitor asks for details that are NOT present in the verified data (for example: O/L exam year, private client names, specific repo URLs for individual projects, pricing/rates, or unrelated general trivia outside Sanjaya's portfolio), clearly and politely explain that that information is not available in Sanjaya's verified portfolio data, and suggest a relevant verified contact channel or portfolio page if helpful.
4. Distinguish clearly between "Client work", "Personal project", "In development", "Coursework", "Prototype / Design", and "Electronics prototype", and distinguish implemented features from planned features when discussing a project.
5. Distinguish "Established Services" (Web Development, Web and UI Design, Database Design) from "Exploratory Areas" (Mobile App Development, Creative and Media Editing, Hardware and Automation).
6. When asked where to find something inside the 3D world, give the landmark name, compass direction from Starting Plaza (e.g., North-East at (36, -44) for Project Pavilion), mention pressing M for the World Map, and mention the corresponding classic route (e.g., /projects).
7. Keep answers concise, warm, well-structured, and easy to read in a small chat panel (prefer 2–5 short sentences or compact bullet points). Do not use markdown tables.

VERIFIED PORTFOLIO DATA:
${buildVerifiedPortfolioContext()}`;

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeInputText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS_REGEX, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function validateAssistantRequest(
  body: unknown,
): { ok: true; data: ValidatedAssistantPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }

  const raw = body as {
    message?: unknown;
    history?: unknown;
    currentRoute?: unknown;
    currentZone?: unknown;
  };

  if (typeof raw.message !== 'string') {
    return { ok: false, error: 'Please enter a question for the portfolio guide.' };
  }

  const trimmedRaw = raw.message.replace(CONTROL_CHARS_REGEX, ' ').replace(/\s+/g, ' ').trim();
  if (!trimmedRaw) {
    return { ok: false, error: 'Message cannot be empty.' };
  }
  if (trimmedRaw.length > MAX_USER_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Questions must be ${MAX_USER_MESSAGE_CHARS} characters or fewer.`,
    };
  }

  const history: AssistantHistoryTurn[] = [];
  if (Array.isArray(raw.history)) {
    const slice = raw.history.slice(-MAX_HISTORY_TURNS);
    for (const item of slice) {
      if (!item || typeof item !== 'object') continue;
      const role = (item as { role?: unknown }).role;
      const text = sanitizeInputText((item as { text?: unknown }).text, 600);
      if ((role === 'user' || role === 'model') && text.length > 0) {
        history.push({ role, text });
      }
    }
  }

  const currentRoute = sanitizeInputText(raw.currentRoute, 80) || '/';
  const currentZone = sanitizeInputText(raw.currentZone, 60) || 'Starting Plaza';

  return {
    ok: true,
    data: {
      message: trimmedRaw,
      history,
      currentRoute,
      currentZone,
    },
  };
}

export function extractNavigationSuggestions(
  userMessage: string,
  assistantReply: string,
): AssistantNavSuggestion[] {
  const haystack = `${userMessage} ${assistantReply}`.toLowerCase();
  const suggestions: AssistantNavSuggestion[] = [];
  const seenRoutes = new Set<string>();

  const pushUnique = (item: AssistantNavSuggestion) => {
    if (seenRoutes.has(item.route) || suggestions.length >= 3) return;
    seenRoutes.add(item.route);
    suggestions.push(item);
  };

  // Match specific project titles first
  for (const proj of PORTFOLIO_PROJECTS) {
    const shortKeyword = proj.title.toLowerCase().split(' ').slice(0, 2).join(' ');
    if (
      haystack.includes(proj.title.toLowerCase()) ||
      haystack.includes(proj.slug) ||
      (shortKeyword.length >= 6 && haystack.includes(shortKeyword))
    ) {
      pushUnique({
        label: `View ${proj.title}`,
        route: `/projects/${proj.slug}`,
        landmarkId: 'projects',
      });
    }
  }

  if (/\b(project|projects|pavilion|portfolio work|built|developed)\b/.test(haystack)) {
    pushUnique({
      label: 'Project Pavilion (/projects)',
      route: '/projects',
      landmarkId: 'projects',
    });
  }

  if (/\b(contact|email|phone|reach|hire|github|linkedin|signal house)\b/.test(haystack)) {
    pushUnique({
      label: 'Signal House (/contact)',
      route: '/contact',
      landmarkId: 'signal-house',
    });
  }

  if (/\b(skill|skills|technolog|tech stack|workshop|react|php|sql|kotlin|flutter|arduino)\b/.test(haystack)) {
    pushUnique({
      label: 'The Workshop (/skills)',
      route: '/skills',
      landmarkId: 'workshop',
    });
  }

  if (/\b(who is|bio|biography|about|studio|anuradhapura|nibm|languages)\b/.test(haystack)) {
    pushUnique({
      label: 'The Studio (/about)',
      route: '/about',
      landmarkId: 'studio',
    });
  }

  if (/\b(education|journey|experience|freelance|lookout|milestone|nibm)\b/.test(haystack)) {
    pushUnique({
      label: 'Lookout Hill (/journey)',
      route: '/journey',
      landmarkId: 'lookout',
    });
  }

  if (/\b(service|services|delivery depot|offer|freelance work)\b/.test(haystack)) {
    pushUnique({
      label: 'Delivery Depot (/services)',
      route: '/services',
      landmarkId: 'delivery',
    });
  }

  if (/\b(paddock|race|racing|garage|car|vehicle|leaderboard)\b/.test(haystack)) {
    pushUnique({
      label: 'The Paddock (/garage)',
      route: '/garage',
      landmarkId: 'paddock',
    });
  }

  if (/\b(query valley|sql challenge|select|where)\b/.test(haystack)) {
    pushUnique({
      label: 'Query Valley',
      route: '/behind-the-scenes',
      landmarkId: 'query-valley',
    });
  }

  if (/\b(signal workshop|rfid|smart gate|achievement)\b/.test(haystack)) {
    pushUnique({
      label: 'Signal Workshop',
      route: '/achievements',
      landmarkId: 'signal-workshop',
    });
  }

  return suggestions;
}

export function classifyGeminiApiError(err: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const errObj = err as { status?: unknown; message?: unknown } | null;
  const httpStatus = typeof errObj?.status === 'number' ? errObj.status : 0;
  const rawMsg = err instanceof Error ? err.message : String(err ?? '');
  const lower = rawMsg.toLowerCase();

  if (
    httpStatus === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('api key not valid') ||
    lower.includes('access_token_scope_insufficient') ||
    lower.includes('403')
  ) {
    return {
      status: 503,
      code: 'AI_KEY_INVALID',
      message:
        'The AI Portfolio Guide is unavailable right now (Gemini API key missing or invalid in Settings > Secrets). All portfolio pages and 3D destinations remain fully usable.',
    };
  }

  if (
    httpStatus === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota')
  ) {
    return {
      status: 429,
      code: 'AI_RATE_LIMITED',
      message:
        'The AI Portfolio Guide is handling many requests right now. Please wait a few seconds and try again.',
    };
  }

  if (httpStatus === 404 || lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 503,
      code: 'AI_MODEL_UNAVAILABLE',
      message:
        'The AI Portfolio Guide model is temporarily unavailable. You can still browse all projects, skills, and contact details across Sanjaya’s World.',
    };
  }

  if (
    httpStatus === 503 ||
    httpStatus === 504 ||
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('econn')
  ) {
    return {
      status: 503,
      code: 'AI_NETWORK_ERROR',
      message:
        'Could not reach the Gemini service right now. Please try again in a moment or explore the portfolio pages directly.',
    };
  }

  return {
    status: 502,
    code: 'AI_UPSTREAM_ERROR',
    message:
      'The AI Portfolio Guide encountered a temporary issue. All portfolio pages and 3D destinations remain available.',
  };
}

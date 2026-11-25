import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSISTANT_MODEL,
  ASSISTANT_SUGGESTED_QUESTIONS,
  ASSISTANT_SYSTEM_INSTRUCTION,
  MAX_USER_MESSAGE_CHARS,
  buildVerifiedPortfolioContext,
  classifyGeminiApiError,
  extractNavigationSuggestions,
  validateAssistantRequest,
} from './portfolioAssistant';
import { PORTFOLIO_PROJECTS, SKILLS_CATALOG, WORLD_LANDMARKS } from '../data/portfolioData';

test('verified portfolio knowledge context includes all factual records and strict non-invention rules', () => {
  const ctx = buildVerifiedPortfolioContext();
  assert.equal(ASSISTANT_MODEL, 'gemini-4-hydrogen');
  assert.equal(ASSISTANT_SUGGESTED_QUESTIONS.length, 6);

  // Core personal & contact facts
  assert.match(ctx, /Sanjaya Lakshan/);
  assert.match(ctx, /NIBM – National Institute of Business Management/);
  assert.match(ctx, /Anuradhapura, Sri Lanka/);
  assert.match(ctx, /sanjayalasnan327@gmail\.com/);
  assert.match(ctx, /\+94 711 814 100/);
  assert.match(ctx, /https:\/\/github\.com\/sanjaya616/);
  assert.match(ctx, /https:\/\/www\.linkedin\.com\/in\/sanjaya-lakshan\//);

  // All 11 projects & all 9 world landmarks are represented
  for (const project of PORTFOLIO_PROJECTS) {
    assert.ok(ctx.includes(project.title), `Missing project in context: ${project.title}`);
  }
  for (const lm of WORLD_LANDMARKS) {
    assert.ok(ctx.includes(lm.title), `Missing landmark in context: ${lm.title}`);
  }
  for (const skill of SKILLS_CATALOG) {
    assert.ok(ctx.includes(skill.name), `Missing skill in context: ${skill.name}`);
  }

  // Grounding & honesty instruction
  assert.match(ASSISTANT_SYSTEM_INSTRUCTION, /NEVER invent/i);
  assert.match(ASSISTANT_SYSTEM_INSTRUCTION, /not available in Sanjaya's verified portfolio data/i);
});

test('validateAssistantRequest rejects empty/oversized inputs and sanitizes conversation history', () => {
  assert.equal(validateAssistantRequest(null).ok, false);
  assert.equal(validateAssistantRequest({ message: '   ' }).ok, false);
  assert.equal(
    validateAssistantRequest({ message: 'a'.repeat(MAX_USER_MESSAGE_CHARS + 1) }).ok,
    false,
  );

  const manyTurns = Array.from({ length: 12 }, (_, idx) => ({
    role: idx % 2 === 0 ? 'user' : 'model',
    text: `Turn ${idx}`,
  }));
  manyTurns.push({ role: 'system' as 'user', text: 'Should be stripped' });

  const valid = validateAssistantRequest({
    message: '  Tell me about\u0000 SmartMove  ',
    history: manyTurns,
    currentRoute: '/',
    currentZone: 'Starting Plaza',
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.message, 'Tell me about SmartMove');
    assert.ok(valid.data.history.length <= 8);
    assert.equal(
      valid.data.history.some((h) => h.text === 'Should be stripped'),
      false,
    );
    assert.equal(valid.data.currentRoute, '/');
    assert.equal(valid.data.currentZone, 'Starting Plaza');
  }
});

test('extractNavigationSuggestions derives accurate clickable portfolio & 3D landmark chips', () => {
  const smartMoveNav = extractNavigationSuggestions(
    'Tell me about the SmartMove project.',
    'SmartMove Transport Solutions is NIBM coursework built with Oracle PL/SQL and MongoDB.',
  );
  assert.ok(smartMoveNav.some((n) => n.route === '/projects/smartmove-transport-solutions'));
  assert.ok(smartMoveNav.length <= 3);

  const contactNav = extractNavigationSuggestions(
    'How can I contact him?',
    'You can reach him at Signal House or email sanjayalasnan327@gmail.com.',
  );
  assert.ok(contactNav.some((n) => n.route === '/contact' && n.landmarkId === 'signal-house'));

  const pavilionNav = extractNavigationSuggestions(
    'Where can I find the projects building?',
    'Head to Project Pavilion at North-East (36, -44).',
  );
  assert.ok(pavilionNav.some((n) => n.route === '/projects' && n.landmarkId === 'projects'));
});

test('classifyGeminiApiError safely classifies API outages, quota exhaustion, and invalid keys', () => {
  const keyErr = classifyGeminiApiError(new Error('403 PERMISSION_DENIED: API_KEY_INVALID'));
  assert.equal(keyErr.status, 503);
  assert.equal(keyErr.code, 'AI_KEY_INVALID');

  const rateErr = classifyGeminiApiError(new Error('429 RESOURCE_EXHAUSTED'));
  assert.equal(rateErr.status, 429);
  assert.equal(rateErr.code, 'AI_RATE_LIMITED');

  const notFoundErr = classifyGeminiApiError(new Error('404 NOT_FOUND model invalid'));
  assert.equal(notFoundErr.status, 503);
  assert.equal(notFoundErr.code, 'AI_MODEL_UNAVAILABLE');

  const netErr = classifyGeminiApiError(new Error('fetch failed ECONNREFUSED'));
  assert.equal(netErr.status, 503);
  assert.equal(netErr.code, 'AI_NETWORK_ERROR');
});

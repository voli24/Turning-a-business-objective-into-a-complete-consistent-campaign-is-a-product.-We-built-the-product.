// The brand guardian's rule book. Creative agents never see these rules:
// like an agency, creatives create and a separate reviewer enforces (separation of duties).

export const RULES = [
  {
    id: 'brand-identity', group: 'Brand', name: 'Product identity', stages: ['asset'],
    text: 'The product keeps its exact identity: shape and proportions (including the lid or cap), logo and large text spelled correctly, brand colors and graphic pattern. Ignore small print, ingredients and volume text.',
  },
  {
    id: 'brand-tone', group: 'Brand', name: 'Specific, not generic', stages: ['plan'],
    text: 'Copy is specific to this brand, product and audience insight. No generic advertising cliches such as "fuel your", "elevate", "unleash", "level up", "taste the difference".',
  },
  {
    id: 'legal-ip', group: 'Legal', name: 'No third-party IP', stages: ['plan', 'asset'],
    text: 'No third-party trademarks, titles, logos, characters, locations, maps or recognizable art styles of games, films, sports leagues or other brands.',
  },
  {
    id: 'legal-violence', group: 'Legal', name: 'No violence or crime', stages: ['plan', 'asset'],
    text: 'No weapons, crime, violence, police chases, heists or illegal activity, in words or imagery.',
  },
  {
    id: 'legal-claims', group: 'Legal', name: 'No functional claims', stages: ['plan'],
    text: 'No health, medical or functional claims about the product, direct or implied: energy, focus, alertness, staying awake, sleep, jitters, performance, wellbeing.',
  },
  {
    id: 'channel-copy', group: 'Channel', name: 'Copy fits the channels', stages: ['plan'], deterministic: true,
    text: 'English headline at most 7 words, Greek headline at most 8 words; every caption at most 125 characters with at most 2 hashtags.',
  },
];

export const PLAN_FIELDS = [
  'headline', 'headline_el', 'captions', 'captions_el',
  'hero_prompt', 'vertical_prompt', 'wide_prompt', 'video_prompt',
];

// Rules for one stage, written out for an LLM reviewer.
export function rulesFor(stage, enabledIds, protectedNames) {
  const names = (protectedNames || '').split(',').map((s) => s.trim()).filter(Boolean);
  return RULES.filter((r) => enabledIds.includes(r.id) && r.stages.includes(stage) && !r.deterministic).map((r) => ({
    id: r.id,
    rule: r.id === 'legal-ip' && names.length ? `${r.text} Protected names that must never appear in words or imagery: ${names.join(', ')}.` : r.text,
  }));
}

// Deterministic channel check: counted by code, not judged by a model.
export function checkChannel(plan) {
  const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
  const problems = [];
  if (words(plan.headline) > 7) problems.push(`English headline has ${words(plan.headline)} words (max 7)`);
  if (words(plan.headline_el) > 8) problems.push(`Greek headline has ${words(plan.headline_el)} words (max 8)`);
  [...(plan.captions || []), ...(plan.captions_el || [])].forEach((c, i) => {
    if (c.length > 125) problems.push(`Caption ${i + 1} has ${c.length} characters (max 125)`);
    const tags = (c.match(/#\w+/gu) || []).length;
    if (tags > 2) problems.push(`Caption ${i + 1} has ${tags} hashtags (max 2)`);
  });
  return { id: 'channel-copy', pass: problems.length === 0, note: problems.length ? problems.join('; ') : 'All copy fits the channel limits.' };
}

// Consistency instructions proven in testing; appended in code so no model can forget them.
export function applyGuards(plan, identityElements) {
  const els = (identityElements || []).join('; ');
  return {
    ...plan,
    hero_prompt: `${plan.hero_prompt} Keep the product exactly as in image 1: same shape, label, logo, text and colors (${els}).`,
    vertical_prompt: `${plan.vertical_prompt} The product must look exactly like image 2: same shape, label, logo, text and colors (${els}).`,
    wide_prompt: `${plan.wide_prompt} The product must look exactly like image 2: same shape, label, logo, text and colors (${els}).`,
    video_prompt: `${plan.video_prompt} The product stays still, sharp and unchanged throughout: same shape, label, logo, text and colors (${els}).`,
  };
}

export function diffPlan(before, after) {
  return PLAN_FIELDS.filter((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f])).map((f) => ({
    field: f, before: before[f], after: after[f],
  }));
}

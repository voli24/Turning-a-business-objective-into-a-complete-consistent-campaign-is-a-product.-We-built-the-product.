import { askJSON, errorJSON } from '@/lib/llm';
import { rulesFor, checkChannel, applyGuards, diffPlan, PLAN_FIELDS } from '@/lib/rules';

export const runtime = 'nodejs';

const MAX_REVISIONS = 2;

const CHECK_SYSTEM = `You are the compliance reviewer of an advertising agency: brand, legal and IP.
Review every field of the campaign plan (image prompts, video prompt, English and Greek copy) against each rule.
Be strict about implied meaning, not only literal words. Judge each rule independently.
Return ONLY JSON: {"results": [{"id": "<rule id>", "pass": true|false, "note": "one short sentence: the exact problem and the field it is in, or why it passes"}]} with one entry per rule.`;

const FIX_SYSTEM = `You revise a campaign plan so it passes compliance review.
Fix ONLY the violations listed. Keep the concept, the scene and the best ideas; change the smallest amount of text that removes each problem.
Return ONLY the full revised plan as JSON with exactly these keys: ${PLAN_FIELDS.join(', ')}.`;

export async function POST(req) {
  try {
    const { plan, strategy, brief, enabledRules, protectedNames } = await req.json();
    const rules = rulesFor('plan', enabledRules, protectedNames);
    const channelOn = enabledRules.includes('channel-copy');
    const pick = (p) => Object.fromEntries(PLAN_FIELDS.map((f) => [f, p[f]]));

    let current = pick(plan);
    const rounds = [];

    for (let round = 1; round <= MAX_REVISIONS + 1; round++) {
      const llm = rules.length
        ? await askJSON(CHECK_SYSTEM, JSON.stringify({ brand: brief.brandName, market: brief.market, rules, plan: current }, null, 2))
        : { results: [] };
      const results = [...(llm.results || []), ...(channelOn ? [checkChannel(current)] : [])];
      const failed = results.filter((r) => !r.pass);
      const entry = { round, results, changes: [] };
      rounds.push(entry);
      if (!failed.length || round > MAX_REVISIONS) break;

      const revised = pick(await askJSON(FIX_SYSTEM, JSON.stringify({ rules, channel_limits: channelOn ? 'English headline max 7 words, Greek headline max 8 words, every caption max 125 characters and max 2 hashtags' : null, violations: failed, plan: current }, null, 2)));
      entry.changes = diffPlan(current, revised);
      current = revised;
    }

    const last = rounds[rounds.length - 1];
    const pass = last.results.every((r) => r.pass);
    return Response.json({
      plan: applyGuards(current, strategy.identity_elements),
      rounds,
      pass,
    });
  } catch (e) {
    return errorJSON(e);
  }
}

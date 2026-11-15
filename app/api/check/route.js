import { askJSON, errorJSON } from '@/lib/llm';
import { rulesFor } from '@/lib/rules';

export const runtime = 'nodejs';

const SYSTEM = `You are a strict brand and legal QA reviewer at an advertising agency.
Image 1 is the original product photo. Image 2 is a generated campaign asset.
Judge image 2 against each rule independently. For product identity, compare the product in image 2 to image 1.
Return ONLY JSON: {"results": [{"id": "<rule id>", "pass": true|false, "note": "one short sentence: the exact visible problem, or why it passes"}]} with one entry per rule.`;

export async function POST(req) {
  try {
    const { assetUrl, productUrl, identityElements, enabledRules, protectedNames } = await req.json();
    const rules = rulesFor('asset', enabledRules, protectedNames).map((r) =>
      r.id === 'brand-identity' ? { ...r, rule: `${r.rule} Elements that must not change: ${(identityElements || []).join('; ')}.` } : r
    );
    if (!rules.length) return Response.json({ results: [], pass: true, note: 'No asset rules are switched on.' });
    const content = [
      { type: 'text', text: JSON.stringify({ rules }, null, 2) },
      { type: 'image_url', image_url: { url: productUrl } },
      { type: 'image_url', image_url: { url: assetUrl } },
    ];
    const r = await askJSON(SYSTEM, content);
    const results = r.results || [];
    const failed = results.filter((x) => !x.pass);
    return Response.json({
      results,
      pass: failed.length === 0,
      note: failed.length ? failed.map((x) => x.note).join(' ') : 'Passes every asset rule.',
    });
  } catch (e) {
    return errorJSON(e);
  }
}

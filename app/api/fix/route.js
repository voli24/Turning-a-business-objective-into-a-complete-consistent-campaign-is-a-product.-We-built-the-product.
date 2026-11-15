import { askJSON, errorJSON } from '@/lib/llm';

export const runtime = 'nodejs';

const SYSTEM = `You repair image-generation prompts after a QA review found problems in the generated image.
Rewrite the prompt so the next generation avoids each listed failure:
- For product drift, describe the drifted detail of the product explicitly and exactly (using the identity elements).
- For IP, violence or crime problems, remove or replace the elements that caused them with neutral alternatives.
Keep the scene, light, composition and every consistency instruction already in the prompt.
Return ONLY JSON: {"prompt": "<the full rewritten prompt>", "reason": "<one short sentence: what you changed>"}`;

export async function POST(req) {
  try {
    const { prompt, failures, identityElements } = await req.json();
    const r = await askJSON(SYSTEM, JSON.stringify({ prompt, failures, identity_elements: identityElements }, null, 2));
    if (!r.prompt) throw new Error('The repair step returned no prompt.');
    return Response.json(r);
  } catch (e) {
    return errorJSON(e);
  }
}

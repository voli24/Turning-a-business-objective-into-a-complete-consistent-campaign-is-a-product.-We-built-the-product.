import { askJSON, errorJSON } from '@/lib/llm';

export const runtime = 'nodejs';

const SYSTEM = `You are the executive creative director of a top advertising agency.
You turn a business objective into campaign strategy. Be specific, concrete and commercially sharp.
Avoid cliches like "elevate", "unleash", "experience the difference".

You will receive a brief as JSON and a photo of the product.
Return ONLY a JSON object with exactly these keys:
{
  "product_identity": "2-3 sentences describing exactly what the product looks like: form factor, materials, label layout, logo, large text, colors and graphic elements. Written so an image model could recognise it.",
  "identity_elements": ["5-8 short items that must never change across assets, e.g. 'slim white can with silver lid', 'light-blue circle with the word taf', 'COLD BREW in black bold type'"],
  "insight": "one sentence: a human truth about the audience that the campaign is built on",
  "key_message": "one sentence the campaign must communicate",
  "concepts": [
    {
      "name": "2-4 word concept name",
      "idea": "one or two sentences: the creative idea",
      "visual_direction": "one or two sentences: setting, light, mood and composition for the hero image",
      "tone": "3-5 words"
    }
  ]
}
Give exactly 3 concepts that are clearly different from each other (e.g. lifestyle, product-as-hero, cultural/local).
Ignore fine print on the product. Use the brand colors in the brief when describing the visual direction.`;

export async function POST(req) {
  try {
    const brief = await req.json();
    if (!brief.productUrl) {
      return Response.json({ error: 'Add a product photo before generating a strategy.' }, { status: 400 });
    }
    const content = [
      { type: 'text', text: `Brief:\n${JSON.stringify(brief, null, 2)}` },
      { type: 'image_url', image_url: { url: brief.productUrl } },
    ];
    const strategy = await askJSON(SYSTEM, content);
    return Response.json(strategy);
  } catch (e) {
    return errorJSON(e);
  }
}

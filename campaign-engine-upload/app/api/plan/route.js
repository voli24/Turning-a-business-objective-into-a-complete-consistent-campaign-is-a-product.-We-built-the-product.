import { askJSON, errorJSON } from '@/lib/llm';

export const runtime = 'nodejs';

const SYSTEM = `You are an award-winning art director and copywriter turning a chosen campaign concept into production prompts and ad copy.
Prompts are concrete visual descriptions (setting, light, lens feel, composition), not marketing language.
Refer to the product generically ("the can", "the bottle"). Do NOT write instructions about keeping the product identical; the system adds those.

Copy must grow out of the audience insight and the concept: specific, surprising, local. Write like a person, not a brand.
Greek copy is written natively for Athens, not translated word for word.

Return ONLY a JSON object with exactly these keys:
{
  "hero_prompt": "Hero photo, 4:5. Place the product from image 1 into the concept's scene. Product large and in sharp focus. Premium advertising photograph.",
  "vertical_prompt": "Vertical 9:16 version of the scene in image 1: same setting, light and style, extended above and below; product centered in the lower half and large in frame.",
  "wide_prompt": "Wide 16:9 version of the scene in image 1: same setting, light and style, extended left and right; product at the right third, calm empty space on the left for a headline.",
  "video_prompt": "6-8 second shot from the still image: slow, gentle camera move, subtle natural motion in the background only.",
  "headline": "English headline",
  "headline_el": "Greek headline",
  "captions": ["three English social captions, different angles"],
  "captions_el": ["three Greek social captions"]
}`;

export async function POST(req) {
  try {
    const { brief, strategy, conceptIndex } = await req.json();
    const concept = strategy?.concepts?.[conceptIndex];
    if (!concept) return Response.json({ error: 'Pick one of the three concepts first.' }, { status: 400 });
    const plan = await askJSON(
      SYSTEM,
      JSON.stringify({ brief, product_identity: strategy.product_identity, insight: strategy.insight, key_message: strategy.key_message, concept }, null, 2)
    );
    return Response.json(plan);
  } catch (e) {
    return errorJSON(e);
  }
}

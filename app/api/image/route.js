import { fal, IMAGE_MODEL, firstUrl, falError } from '@/lib/fal';

export const runtime = 'nodejs';
export const maxDuration = 300; // fal generation and the pre-flight loop can take minutes

export async function POST(req) {
  try {
    const { prompt, imageUrls, aspectRatio } = await req.json();
    const t0 = Date.now();
    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt,
        image_urls: imageUrls,
        aspect_ratio: aspectRatio || 'auto',
        enable_prompt_expansion: false,
      },
    });
    const url = firstUrl(result.data);
    if (!url) return Response.json({ error: 'The image model returned no image.' }, { status: 502 });
    return Response.json({ url, ms: Date.now() - t0 });
  } catch (e) {
    return Response.json({ error: falError(e) }, { status: 500 });
  }
}

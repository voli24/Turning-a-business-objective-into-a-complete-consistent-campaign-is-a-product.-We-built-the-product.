import { fal, VIDEO_MODEL, firstUrl, falError } from '@/lib/fal';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { prompt, imageUrl } = await req.json();
    const t0 = Date.now();
    const result = await fal.subscribe(VIDEO_MODEL, {
      input: { prompt, image_url: imageUrl },
    });
    const url = firstUrl(result.data);
    if (!url) return Response.json({ error: 'The video model returned no video.' }, { status: 502 });
    return Response.json({ url, ms: Date.now() - t0 });
  } catch (e) {
    return Response.json({ error: falError(e) }, { status: 500 });
  }
}

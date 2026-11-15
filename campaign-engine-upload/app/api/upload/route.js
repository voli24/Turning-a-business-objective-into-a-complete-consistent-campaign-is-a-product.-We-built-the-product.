import { fal, falError } from '@/lib/fal';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No image file was attached.' }, { status: 400 });
    }
    const url = await fal.storage.upload(file);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: falError(e) }, { status: 500 });
  }
}

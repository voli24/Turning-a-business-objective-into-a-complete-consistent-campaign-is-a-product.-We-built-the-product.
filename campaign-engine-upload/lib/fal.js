import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || 'blackforestlabs/flux-3/edit-image';
export const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || 'blackforestlabs/flux-3-max/image-to-video';

// fal models return slightly different shapes; take the first media URL we find.
export function firstUrl(data) {
  return (
    data?.images?.[0]?.url ||
    data?.image?.url ||
    data?.video?.url ||
    data?.videos?.[0]?.url ||
    data?.url ||
    null
  );
}

export function falError(e) {
  const detail = e?.body?.detail ? JSON.stringify(e.body.detail) : '';
  return `${e?.message || 'fal request failed'} ${detail}`.trim();
}

export { fal };

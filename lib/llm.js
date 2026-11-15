import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';

// Ask the model for a JSON object. `content` can be a string or a list of text/image parts.
export async function askJSON(system, content) {
  const res = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content },
    ],
  });
  return JSON.parse(res.choices[0].message.content);
}

export function errorJSON(e, status = 500) {
  return Response.json({ error: e?.message || String(e) }, { status });
}

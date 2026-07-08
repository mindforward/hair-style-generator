// Vercel Serverless Function — proxies Gemini Interactions API
// Runs from US (iad1) servers, bypassing regional restrictions

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, image } = req.body;
  if (!prompt || !image) {
    return res.status(400).json({ error: 'Missing prompt or image' });
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) {
    return res.status(500).json({
      error: 'API key not configured on server. Ask the developer to set GOOGLE_API_KEY env var.',
    });
  }

  try {
    const body = {
      model: 'gemini-3.1-flash-image',
      input: [
        { type: 'text', text: prompt },
        { type: 'image', data: image, mime_type: 'image/jpeg' },
      ],
    };

    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': GOOGLE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error?.message || 'Google API error ' + resp.status);
    }

    // Extract image from response steps
    let imageData = null;
    if (data.steps) {
      for (const step of data.steps) {
        if (step.type === 'model_output' && step.content) {
          for (const item of step.content) {
            if (item.type === 'image' && item.data) {
              imageData = {
                data: item.data,
                mime_type: item.mime_type || 'image/png',
              };
              break;
            }
          }
        }
        if (imageData) break;
      }
    }
    // Fallback: output_image convenience field
    if (!imageData && data.output_image?.data) {
      imageData = {
        data: data.output_image.data,
        mime_type: data.output_image.mime_type || 'image/png',
      };
    }

    if (!imageData) {
      throw new Error('Model did not return an image');
    }

    return res.status(200).json(imageData);
  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message });
  }
}

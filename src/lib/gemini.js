const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_API_KEY'
// Replace `YOUR_API_KEY` with your real Gemini API key for local testing.
// For production, route this call through your backend instead of exposing the key in the browser.

function sleep(duration = 1100) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

export async function generateWithGemini(prompt) {
  if (!prompt?.trim()) {
    throw new Error('Le prompt Gemini est vide.')
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY') {
    await sleep()
    return null
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.error?.status ||
      "L'appel Gemini a échoué."
    throw new Error(apiMessage)
  }

  const text = payload?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    ?.map((part) => part?.text || '')
    ?.join('\n')
    ?.trim()

  return text || null
}

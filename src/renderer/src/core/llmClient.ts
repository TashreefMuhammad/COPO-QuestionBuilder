import type { CourseSetup } from './models'

export type ProviderName = 'openai' | 'anthropic' | 'gemini'

export interface LLMConfig {
  provider: ProviderName
  apiKey: string
  model?: string
}

export interface ClassificationResult {
  predicted_domain: string
  predicted_level: string
  level_confidence: number
  co_scores: Record<string, number>
  best_co: string | null
  complexity_notes: string
  flags: string[]
}

function extractJson(text: string): ClassificationResult {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error(`Could not parse model response as JSON:\n${text.slice(0, 400)}`)
  }
}

function buildPrompt(
  questionText: string, domain: string, level: string,
  verb: string, setup: CourseSetup
): string {
  const coLines = setup.cos.map(c => `- ${c.code}: ${c.statement}`).join('\n') || '(none)'
  return `You are an expert in Bloom's Taxonomy and outcome-based engineering education.
Analyze this exam question:

Question: "${questionText}"
Claimed domain: ${domain}
Claimed Bloom's level: ${level}
Claimed action verb: ${verb}

Course Outcomes:
${coLines}

Judge the ACTUAL cognitive complexity the question demands and which CO it best matches.
Respond with ONLY valid JSON, no markdown, exactly this shape:
{
  "predicted_domain": "Cognitive|Affective|Psychomotor",
  "predicted_level": "<level>",
  "level_confidence": 0.0,
  "co_scores": {"CO1": 0.0},
  "best_co": "CO_code or null",
  "complexity_notes": "one sentence",
  "flags": []
}`
}

export async function classifyQuestion(
  questionText: string, domain: string, level: string,
  verb: string, setup: CourseSetup, config: LLMConfig
): Promise<ClassificationResult> {
  const prompt = buildPrompt(questionText, domain, level, verb, setup)
  const model = config.model

  if (config.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0
      })
    })
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return extractJson(data.choices[0].message.content)
  }

  if (config.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return extractJson(data.content.map((b: any) => b.text || '').join(''))
  }

  if (config.provider === 'gemini') {
    const m = model || 'gemini-2.0-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${config.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return extractJson(data.candidates[0].content.parts[0].text)
  }

  throw new Error(`Unknown provider: ${config.provider}`)
}

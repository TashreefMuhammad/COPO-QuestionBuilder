import { useState, useEffect } from 'react'

interface ProviderModel {
  id: string
  label: string
  note: string   // short description shown in dropdown
}

interface ProviderDef {
  id: string
  label: string
  link: string
  linkLabel: string
  models: ProviderModel[]
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'openai', label: 'OpenAI', link: 'https://platform.openai.com/api-keys', linkLabel: 'Get an OpenAI key ↗',
    models: [
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',  note: 'Recommended — fast, cheap, great for classification' },
      { id: 'gpt-4o',       label: 'GPT-4o',        note: 'More capable, higher cost' },
      { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo',  note: 'Previous flagship, good quality' },
      { id: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo',note: 'Older, very cheap' },
    ]
  },
  {
    id: 'anthropic', label: 'Anthropic (Claude)', link: 'https://console.anthropic.com/settings/keys', linkLabel: 'Get an Anthropic key ↗',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku',  note: 'Recommended — very fast, low cost' },
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet', note: 'Smarter, moderate cost' },
      { id: 'claude-opus-4-6',           label: 'Claude Opus',   note: 'Most capable, highest cost' },
    ]
  },
  {
    id: 'gemini', label: 'Google Gemini', link: 'https://aistudio.google.com/app/apikey', linkLabel: 'Get a Gemini key ↗',
    models: [
      { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',      note: 'Recommended — fast, free tier available' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', note: 'Lightest, very low cost' },
      { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash',      note: 'Previous fast model' },
      { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',        note: 'More capable, higher cost' },
    ]
  }
]

const CUSTOM_ID = '__custom__'

function parseApiError(status: number, raw: string): string {
  try {
    const obj = JSON.parse(raw)
    if (obj?.error?.message) return `Error ${status}: ${obj.error.message}`
  } catch {}
  return `Error ${status}: ${raw.slice(0, 200)}${raw.length > 200 ? '…' : ''}`
}

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [provider,    setProvider]    = useState('openai')
  const [modelId,     setModelId]     = useState('')   // known model id or CUSTOM_ID
  const [customModel, setCustomModel] = useState('')   // only used when modelId === CUSTOM_ID
  const [apiKey,      setApiKey]      = useState('')
  const [testing,     setTesting]     = useState(false)
  const [testResult,  setTestResult]  = useState<string | null>(null)

  const providerDef = PROVIDERS.find(p => p.id === provider)!

  // Effective model string sent to the API
  const effectiveModel = modelId === CUSTOM_ID
    ? customModel
    : modelId || providerDef.models[0].id

  useEffect(() => {
    window.api.settings.get('provider').then((p: any) => { if (p) setProvider(p) })
    window.api.settings.get('model').then((m: any) => {
      if (!m) return
      // Check if saved model is one of the known ones for this provider, else treat as custom
      const allModels = PROVIDERS.flatMap(pr => pr.models.map(mo => mo.id))
      if (allModels.includes(m)) { setModelId(m) }
      else { setModelId(CUSTOM_ID); setCustomModel(m) }
    })
  }, [])

  useEffect(() => {
    window.api.apiKey.load(provider).then((k: any) => setApiKey(k || ''))
    setTestResult(null)
    // Reset model selection to provider default when switching provider
    setModelId(providerDef.models[0].id)
  }, [provider])

  const save = async () => {
    await window.api.settings.set('provider', provider)
    await window.api.settings.set('model', effectiveModel)
    if (apiKey) await window.api.apiKey.save(provider, apiKey)
    onClose()
  }

  const test = async () => {
    if (!apiKey) return
    setTesting(true)
    setTestResult(null)
    const testPrompt = `Respond ONLY with this exact JSON, no markdown:
{"predicted_domain":"Cognitive","predicted_level":"Remember","level_confidence":1.0,"co_scores":{},"best_co":null,"complexity_notes":"test ok","flags":[]}`
    try {
      let res: Response
      if (provider === 'openai') {
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: effectiveModel, messages: [{ role: 'user', content: testPrompt }], temperature: 0 })
        })
      } else if (provider === 'anthropic') {
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: effectiveModel, max_tokens: 200, messages: [{ role: 'user', content: testPrompt }] })
        })
      } else {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] })
        })
      }
      if (res.ok) setTestResult('✓ Connection successful! The model responded correctly.')
      else setTestResult(parseApiError(res.status, await res.text()))
    } catch (e: any) {
      setTestResult(`Connection failed: ${e.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">

        <h2 className="text-lg font-semibold">Settings — LLM Provider</h2>

        <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
          The LLM checks whether your question's complexity actually matches the
          Bloom's level you claimed, and which CO it best fits. Without a key
          the app still works — only the deterministic verb check runs.
        </p>

        {/* Provider */}
        <div>
          <label className="label">Provider</label>
          <select className="input-full" value={provider} onChange={e => setProvider(e.target.value)}>
            {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* Model dropdown */}
        <div>
          <label className="label">Model</label>
          <select className="input-full" value={modelId} onChange={e => setModelId(e.target.value)}>
            {providerDef.models.map(m => (
              <option key={m.id} value={m.id}>{m.label} — {m.note}</option>
            ))}
            <option value={CUSTOM_ID}>Custom (type a model name manually)</option>
          </select>
          {modelId === CUSTOM_ID && (
            <input
              className="input-full mt-2"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
            />
          )}
        </div>

        {/* API key */}
        <div>
          <label className="label">
            API Key
            <a href={providerDef.link} target="_blank" rel="noreferrer"
              className="ml-2 text-blue-600 text-xs hover:underline font-normal">
              {providerDef.linkLabel}
            </a>
          </label>
          <input
            type="password"
            className="input-full"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Paste your API key here"
          />
          <p className="text-xs text-gray-500 mt-1">
            Stored encrypted on your machine — never sent anywhere except {providerDef.label}'s API.
          </p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`text-sm px-3 py-2 rounded max-h-32 overflow-y-auto break-words
            ${testResult.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <button className="btn-secondary flex-1" onClick={test} disabled={testing || !apiKey}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          <button className="btn-primary flex-1" onClick={save}>Save</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>

      </div>
    </div>
  )
}

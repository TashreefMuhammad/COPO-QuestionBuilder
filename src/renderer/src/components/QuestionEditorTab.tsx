import { useState, useEffect } from 'react'
import type { CourseSetup, QuestionRecord, VerificationResult } from '../core/models'
import { newQuestion } from '../core/models'
import { DOMAIN_LEVELS, suggestVerbs, type Domain } from '../core/bloomTaxonomy'
import { verifyQuestion } from '../core/validators'
import type { LLMConfig } from '../core/llmClient'

interface Props {
  setup: CourseSetup
  questions: QuestionRecord[]
  setQuestions: (qs: QuestionRecord[]) => void
}

const DOMAINS: Domain[] = ['Cognitive', 'Affective', 'Psychomotor']

async function loadLLMConfig(): Promise<LLMConfig | undefined> {
  const provider = await window.api.settings.get('provider') as string
  if (!provider) return undefined
  const apiKey = await window.api.apiKey.load(provider) as string
  if (!apiKey) return undefined
  const model = await window.api.settings.get('model') as string | undefined
  return { provider: provider as any, apiKey, model }
}

export default function QuestionEditorTab({ setup, questions, setQuestions }: Props) {
  const [q, setQ] = useState<QuestionRecord>(newQuestion())
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verbSuggestions, setVerbSuggestions] = useState<string[]>([])

  const update = (patch: Partial<QuestionRecord>) => setQ(s => ({ ...s, ...patch }))

  useEffect(() => {
    setVerbSuggestions(suggestVerbs(q.domain as Domain, q.level))
  }, [q.domain, q.level])

  const levels = DOMAIN_LEVELS[q.domain as Domain] ?? []

  const verify = async () => {
    if (!setup.cos.length) { alert('Apply your course setup first (Setup tab).'); return }
    setVerifying(true)
    setResult(null)
    try {
      const llmConfig = await loadLLMConfig()
      const res = await verifyQuestion(q, setup, llmConfig)
      setResult(res)
      update({ verification: res })
    } finally {
      setVerifying(false)
    }
  }

  const save = () => {
    const existing = questions.findIndex(x => x.id === q.id)
    if (existing >= 0) {
      const updated = [...questions]; updated[existing] = q; setQuestions(updated)
    } else {
      setQuestions([...questions, q])
    }
    alert('Saved to Question Bank.')
  }

  const clear = () => { setQ(newQuestion()); setResult(null) }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Parameters */}
        <div className="card space-y-3">
          <h2 className="text-base font-semibold">Parameters</h2>

          <div>
            <label className="label">Domain</label>
            <select className="input-full" value={q.domain} onChange={e => update({ domain: e.target.value, level: '' })}>
              {DOMAINS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Bloom's Level</label>
            <select className="input-full" value={q.level} onChange={e => update({ level: e.target.value })}>
              <option value="">-- select --</option>
              {levels.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Course Outcome</label>
            <select className="input-full" value={q.claimedCo} onChange={e => update({ claimedCo: e.target.value })}>
              <option value="">-- select --</option>
              {setup.cos.map(co => <option key={co.code} value={co.code}>{co.code} — {co.statement.slice(0,40)}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Action Verb</label>
            <input className="input-full" value={q.claimedVerb}
              onChange={e => update({ claimedVerb: e.target.value })}
              placeholder="e.g. analyze, design, explain..." />
            {verbSuggestions.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-gray-500 mb-1">Suggested for {q.domain}/{q.level}:</p>
                <div className="flex flex-wrap gap-1">
                  {verbSuggestions.slice(0, 10).map(v => (
                    <button key={v} onClick={() => update({ claimedVerb: v })}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Marks</label>
            <input type="number" min={0} step={0.5} className="input-full" value={q.marks}
              onChange={e => update({ marks: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>

        {/* Right: Question text + result */}
        <div className="space-y-3">
          <div className="card">
            <label className="label">Question Text</label>
            <textarea className="input-full h-36 resize-none" value={q.text}
              onChange={e => update({ text: e.target.value })}
              placeholder="Write your question here..." />
          </div>

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={verify} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
            <button className="btn-secondary flex-1" onClick={save}>Save to Bank</button>
            <button className="btn-secondary" onClick={clear}>Clear</button>
          </div>

          {result && <VerificationPanel result={result} />}
        </div>
      </div>
    </div>
  )
}

function VerificationPanel({ result }: { result: VerificationResult }) {
  const allOk = result.issues.length === 0
  return (
    <div className="card space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Verification Result</h3>
        {allOk
          ? <span className="ok-badge">All checks passed</span>
          : <span className="issue-badge">{result.issues.length} issue{result.issues.length > 1 ? 's' : ''}</span>
        }
      </div>

      {result.verbFound && (
        <div className="flex gap-2 items-center">
          <span className="text-gray-600">Verb:</span>
          <code className="bg-gray-100 px-1 rounded">{result.verbFound}</code>
          {result.verbMatchesClaim
            ? <span className="ok-badge">Correct</span>
            : result.verbRecognized
              ? <span className="warn-badge">Wrong level ({result.verbAlternateMatches.join(', ')})</span>
              : <span className="issue-badge">Unrecognized</span>
          }
        </div>
      )}

      {result.llmUsed && (
        <div className="space-y-1 bg-blue-50 p-2 rounded">
          <p className="text-xs font-medium text-blue-800">LLM Semantic Check</p>
          <p>Predicted level: <strong>{result.llmPredictedLevel}</strong>
            {result.llmLevelConfidence !== undefined && ` (${Math.round(result.llmLevelConfidence * 100)}% confidence)`}
          </p>
          {result.bestCo && <p>Best CO match: <strong>{result.bestCo}</strong></p>}
          {result.complexityNotes && <p className="text-gray-600 italic">{result.complexityNotes}</p>}
          {Object.keys(result.coScores).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(result.coScores).map(([co, score]) => (
                <span key={co} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {co}: {(score * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {result.mappedPo && (
        <div className="flex gap-2 items-center">
          <span className="text-gray-600 text-xs">Maps to PO:</span>
          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium">{result.mappedPo}</span>
        </div>
      )}

      {result.issues.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          <p className="font-medium text-red-700 sticky top-0 bg-white pb-0.5">Issues:</p>
          {result.issues.map((issue, i) => (
            <p key={i} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs break-words">• {issue}</p>
          ))}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          <p className="font-medium text-amber-700 sticky top-0 bg-white pb-0.5">Suggestions:</p>
          {result.suggestions.map((s, i) => (
            <p key={i} className="text-amber-700 bg-amber-50 px-2 py-1 rounded text-xs break-words">• {s}</p>
          ))}
        </div>
      )}
    </div>
  )
}

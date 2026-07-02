import { lookupVerb, verbMatchesLevel } from './bloomTaxonomy'
import { poForCo } from './coPOEngine'
import { classifyQuestion, type LLMConfig } from './llmClient'
import type { CourseSetup, QuestionRecord, VerificationResult } from './models'

export async function verifyQuestion(
  q: QuestionRecord,
  setup: CourseSetup,
  llmConfig?: LLMConfig
): Promise<VerificationResult> {
  const result: VerificationResult = {
    verbFound: '', verbRecognized: false, verbMatchesClaim: false,
    verbAlternateMatches: [], llmUsed: false, coScores: {},
    complexityNotes: '', mappedPo: '', issues: [], suggestions: []
  }

  // Deterministic verb check
  const verb = (q.claimedVerb || '').trim().toLowerCase()
  if (verb) {
    result.verbFound = verb
    const matches = lookupVerb(verb)
    result.verbRecognized = matches.length > 0
    result.verbMatchesClaim = verbMatchesLevel(verb, q.domain as any, q.level)
    if (result.verbRecognized && !result.verbMatchesClaim) {
      result.verbAlternateMatches = matches.map(m => `${m.domain}/${m.level}`)
      result.issues.push(
        `"${verb}" is not a standard verb for ${q.domain}/${q.level}. ` +
        `Recognized for: ${result.verbAlternateMatches.join(', ')}.`
      )
    } else if (!result.verbRecognized) {
      result.issues.push(`"${verb}" is not in the known action-verb list for any domain/level.`)
    }
  } else {
    result.issues.push('No action verb specified.')
  }

  // CO → PO lookup (deterministic, 1-to-1)
  if (q.claimedCo) {
    const po = poForCo(setup, q.claimedCo)
    result.mappedPo = po
    if (!po) {
      result.issues.push(`${q.claimedCo} is not mapped to any PO in the setup.`)
    }
  }

  // LLM semantic layer
  if (llmConfig && q.text.trim()) {
    try {
      const raw = await classifyQuestion(q.text, q.domain, q.level, verb, setup, llmConfig)
      result.llmUsed = true
      result.llmPredictedLevel = raw.predicted_level
      result.llmLevelConfidence = raw.level_confidence
      result.coScores = raw.co_scores ?? {}
      result.bestCo = raw.best_co ?? undefined
      result.complexityNotes = raw.complexity_notes ?? ''

      if (raw.predicted_level && raw.predicted_level !== q.level) {
        result.issues.push(
          `LLM estimates actual complexity as "${raw.predicted_level}", not "${q.level}". ` +
          raw.complexity_notes
        )
        result.suggestions.push(
          `Consider relabelling as ${raw.predicted_level}, or rewriting the question to genuinely demand ${q.level}-level thinking.`
        )
      }
      if (q.claimedCo && raw.best_co && raw.best_co !== q.claimedCo) {
        result.issues.push(`Semantically, this question fits ${raw.best_co} better than ${q.claimedCo}.`)
        result.suggestions.push(`Consider reassigning to ${raw.best_co}.`)
      }
    } catch (e: any) {
      result.issues.push(`LLM check failed: ${e.message}`)
    }
  } else if (!llmConfig) {
    result.suggestions.push('No API key configured — only deterministic verb check ran.')
  }

  return result
}

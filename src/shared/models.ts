export interface ProgramOutcome {
  code: string
  statement: string
}

export interface CourseOutcome {
  code: string
  statement: string
}

export interface CourseSetup {
  courseTitle: string
  courseCode: string
  pos: ProgramOutcome[]
  cos: CourseOutcome[]
  // Each CO maps to exactly ONE PO code, or "" if unmapped.
  // One PO can be mapped to by multiple COs.
  coPOMatrix: Record<string, string>  // coCode -> poCode | ""
}

export interface VerificationResult {
  verbFound: string
  verbRecognized: boolean
  verbMatchesClaim: boolean
  verbAlternateMatches: string[]
  llmUsed: boolean
  llmPredictedLevel?: string
  llmLevelConfidence?: number
  coScores: Record<string, number>
  bestCo?: string
  complexityNotes: string
  mappedPo: string   // the single PO this CO maps to (or "")
  issues: string[]
  suggestions: string[]
}

export interface QuestionRecord {
  id: string
  text: string
  marks: number
  domain: string
  level: string
  claimedVerb: string
  claimedCo: string
  verification?: VerificationResult
}

// A named course bundle stored in the course list
export interface CourseProject {
  id: string
  name: string          // display label e.g. "EEE 2102 – Circuits II"
  setup: CourseSetup
  questions: QuestionRecord[]
}

export function emptySetup(): CourseSetup {
  return { courseTitle: '', courseCode: '', pos: [], cos: [], coPOMatrix: {} }
}

export function newQuestion(): QuestionRecord {
  return {
    id: Math.random().toString(36).slice(2, 10),
    text: '', marks: 0, domain: 'Cognitive',
    level: 'Remember', claimedVerb: '', claimedCo: ''
  }
}

export function newCourseProject(name = 'New Course'): CourseProject {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name,
    setup: emptySetup(),
    questions: []
  }
}

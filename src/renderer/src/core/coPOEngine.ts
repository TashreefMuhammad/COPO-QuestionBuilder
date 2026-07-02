import type { ProgramOutcome, CourseSetup } from './models'

export const BAETE_PRESET: ProgramOutcome[] = [
  { code: 'PO1',  statement: 'Engineering knowledge: apply mathematics, science, and engineering fundamentals to complex problems.' },
  { code: 'PO2',  statement: 'Problem analysis: identify, formulate, and analyze complex engineering problems using first principles.' },
  { code: 'PO3',  statement: 'Design/development of solutions: design solutions considering public health, safety, and environmental factors.' },
  { code: 'PO4',  statement: 'Investigation: conduct investigations of complex problems using research-based methods.' },
  { code: 'PO5',  statement: 'Modern tool usage: select and apply appropriate modern engineering/IT tools, understanding their limitations.' },
  { code: 'PO6',  statement: 'The engineer and society: assess societal, health, safety, legal, and cultural issues relevant to engineering practice.' },
  { code: 'PO7',  statement: 'Environment and sustainability: understand the impact of engineering work on society and the environment.' },
  { code: 'PO8',  statement: 'Ethics: apply ethical principles and commit to the norms of engineering practice.' },
  { code: 'PO9',  statement: 'Individual and team work: function effectively as an individual and within diverse, multidisciplinary teams.' },
  { code: 'PO10', statement: 'Communication: communicate effectively through writing, presentations, and giving/receiving instructions.' },
  { code: 'PO11', statement: 'Project management and finance: apply engineering and management principles to project and resource management.' },
  { code: 'PO12', statement: 'Life-long learning: recognize the need for, and engage in, independent and continuing learning.' }
]

/** Return the single PO this CO maps to, or "" if unmapped */
export function poForCo(setup: CourseSetup, coCode: string): string {
  return setup.coPOMatrix[coCode] ?? ''
}

export function validateSetup(setup: CourseSetup): string[] {
  const problems: string[] = []
  if (!setup.pos.length) problems.push('No Program Outcomes defined.')
  if (!setup.cos.length) problems.push('No Course Outcomes defined.')
  for (const co of setup.cos) {
    if (!setup.coPOMatrix[co.code]) {
      problems.push(`${co.code} is not mapped to any PO.`)
    }
  }
  return problems
}

export function ensureMatrixShape(setup: CourseSetup): void {
  const poCodes = new Set(setup.pos.map(p => p.code))
  for (const co of setup.cos) {
    const current = setup.coPOMatrix[co.code]
    // If the currently assigned PO no longer exists, clear it
    if (current && !poCodes.has(current)) {
      setup.coPOMatrix[co.code] = ''
    } else if (!(co.code in setup.coPOMatrix)) {
      setup.coPOMatrix[co.code] = ''
    }
  }
  // Remove stale CO keys
  for (const key of Object.keys(setup.coPOMatrix)) {
    if (!setup.cos.find(c => c.code === key)) {
      delete setup.coPOMatrix[key]
    }
  }
}

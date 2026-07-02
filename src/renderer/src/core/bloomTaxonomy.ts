export type Domain = 'Cognitive' | 'Affective' | 'Psychomotor'

export const COGNITIVE_LEVELS = ['Remember','Understand','Apply','Analyze','Evaluate','Create'] as const
export const AFFECTIVE_LEVELS = ['Receiving','Responding','Valuing','Organizing','Characterizing'] as const
export const PSYCHOMOTOR_LEVELS = ['Imitation','Manipulation','Precision','Articulation','Naturalization'] as const

export const DOMAIN_LEVELS: Record<Domain, readonly string[]> = {
  Cognitive:    COGNITIVE_LEVELS,
  Affective:    AFFECTIVE_LEVELS,
  Psychomotor:  PSYCHOMOTOR_LEVELS
}

const COGNITIVE_VERBS: Record<string, string[]> = {
  Remember:    ['define','list','recall','name','identify','state','label','match','recognize','select','repeat','reproduce','memorize','quote','tabulate','cite','enumerate','record'],
  Understand:  ['explain','describe','summarize','classify','discuss','interpret','paraphrase','illustrate','compare','contrast','translate','infer','extend','predict','associate','distinguish','restate','exemplify','outline'],
  Apply:       ['apply','demonstrate','solve','use','calculate','compute','implement','execute','show','complete','examine','modify','relate','change','employ','operate','sketch','construct'],
  Analyze:     ['analyze','differentiate','organize','deconstruct','test','question','categorize','attribute','detect','discriminate','investigate','compare','contrast','infer'],
  Evaluate:    ['evaluate','judge','critique','justify','defend','argue','assess','appraise','conclude','recommend','support','validate','prioritize','rank','convince','select'],
  Create:      ['design','construct','develop','formulate','propose','plan','compose','generate','produce','devise','invent','assemble','synthesize','integrate','build','derive','model','hypothesize']
}

const AFFECTIVE_VERBS: Record<string, string[]> = {
  Receiving:      ['ask','choose','follow','give','hold','identify','locate','select','attend','name'],
  Responding:     ['answer','assist','comply','conform','discuss','greet','help','perform','practice','present','volunteer','label'],
  Valuing:        ['complete','demonstrate','differentiate','explain','follow','initiate','invite','join','justify','propose','share','value'],
  Organizing:     ['adhere','alter','arrange','combine','complete','defend','generalize','identify','integrate','modify','order','organize','prepare','relate','synthesize'],
  Characterizing: ['act','discriminate','display','influence','listen','perform','propose','qualify','question','revise','serve','solve','verify']
}

const PSYCHOMOTOR_VERBS: Record<string, string[]> = {
  Imitation:     ['copy','follow','replicate','repeat','adhere','attempt','trace'],
  Manipulation:  ['re-create','build','perform','execute','implement','assemble','manipulate'],
  Precision:     ['demonstrate','complete','show','perfect','calibrate','control','achieve'],
  Articulation:  ['construct','combine','coordinate','integrate','adapt','develop','formulate'],
  Naturalization:['design','specialize','originate','automate','manage','master','create']
}

export const DOMAIN_VERBS: Record<Domain, Record<string, string[]>> = {
  Cognitive:   COGNITIVE_VERBS,
  Affective:   AFFECTIVE_VERBS,
  Psychomotor: PSYCHOMOTOR_VERBS
}

export interface VerbMatch { domain: Domain; level: string }

export function lookupVerb(verb: string): VerbMatch[] {
  const v = verb.trim().toLowerCase()
  const matches: VerbMatch[] = []
  for (const [domain, levels] of Object.entries(DOMAIN_VERBS) as [Domain, Record<string,string[]>][]) {
    for (const [level, verbs] of Object.entries(levels)) {
      if (verbs.includes(v)) matches.push({ domain, level })
    }
  }
  return matches
}

export function verbMatchesLevel(verb: string, domain: Domain, level: string): boolean {
  const v = verb.trim().toLowerCase()
  return (DOMAIN_VERBS[domain]?.[level] ?? []).includes(v)
}

export function suggestVerbs(domain: Domain, level: string): string[] {
  return DOMAIN_VERBS[domain]?.[level] ?? []
}

export function extractKnownVerbs(text: string): string[] {
  const tokens = text.toLowerCase().match(/[a-z-]+/g) ?? []
  return tokens.filter(t => lookupVerb(t).length > 0)
}

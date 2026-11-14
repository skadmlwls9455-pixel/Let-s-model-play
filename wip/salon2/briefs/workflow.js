export const meta = {
  name: 'salon-part2-v2',
  description: 'Finish the interrupted salon build, review it through three lenses with adversarial verifiers, fix confirmed findings, run the final check',
  phases: [
    { title: 'Finish', detail: 'assess and finish the interrupted build' },
    { title: 'Review', detail: 'phone play, welfare and honesty, code and edge cases' },
    { title: 'Verify', detail: 'adversarial check of each review' },
    { title: 'Fix', detail: 'apply confirmed findings' },
    { title: 'Final', detail: 'full regression, docs, owner shots, hand-over' },
  ],
}

const S = '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad'
const B = S + '/salon2/v2'
const brief = name => 'Your task brief is the file ' + B + '/' + name + '.md. Read ' + B + '/COMMON.md first, then the brief, and follow both exactly. SCRATCH means ' + S + '.'

const str = { type: 'string' }
const strs = { type: 'array', items: str }
const sev = { type: 'string', enum: ['must', 'should', 'nit'] }
const WORK_SCHEMA = {
  type: 'object',
  properties: {
    summary: str,
    requirement_table: str,
    changes: str,
    files_changed: strs,
    tests: str,
    shots: strs,
    doc_edits: str,
    judgement_calls: str,
    not_done: str,
  },
  required: ['summary', 'requirement_table', 'files_changed', 'tests', 'not_done'],
}
const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    summary: str,
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: str, title: str, severity: sev, claim: str, evidence: str, suggested_fix: str, file: str },
        required: ['id', 'title', 'severity', 'claim', 'evidence'],
      },
    },
    checklist: str,
    tables: str,
    artifacts: strs,
    not_checked: str,
  },
  required: ['summary', 'findings'],
}
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: str, confirmed: { type: 'boolean' }, severity: sev, reason: str, evidence: str, fix: str },
        required: ['id', 'confirmed', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}
const FIX_SCHEMA = {
  type: 'object',
  properties: {
    summary: str,
    results: {
      type: 'array',
      items: { type: 'object', properties: { id: str, status: str, files: str, how_verified: str }, required: ['id', 'status'] },
    },
    tests: str,
    owner_questions: str,
  },
  required: ['summary', 'results', 'tests'],
}
const FINAL_SCHEMA = {
  type: 'object',
  properties: {
    ownerKo: str,
    tech: str,
    tests: str,
    shots: strs,
    changedFiles: strs,
    commitMsgKo: str,
    risks: str,
  },
  required: ['ownerKo', 'tech', 'tests', 'shots', 'changedFiles', 'commitMsgKo', 'risks'],
}

phase('Finish')
const fin = await agent(brief('finish-b'), { label: 'finish-b', phase: 'Finish', schema: WORK_SCHEMA })
if (!fin) {
  log('finish-b died: stopping so the lead can read its notes (' + B + '/finish-b/notes.md) before anyone reviews a half-edited tree')
  return { finish: null, reviewed: null, confirmed: [], fix: null, final: null }
}
const finText = JSON.stringify(fin, null, 1)

const REVIEWS = ['verify-phone', 'verify-welfare', 'verify-edge']
const reviewed = await pipeline(
  REVIEWS,
  key => agent(brief(key) + '\n\nThe finisher\'s report (do not trust it; check the game):\n' + finText, { label: key, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (rev, key) => {
    if (!rev || !rev.findings || !rev.findings.length) return { key, review: rev, verdicts: [] }
    const p = brief('refute') + ' Your scratch folder: ' + B + '/refute-' + key + '/.\n\nThe reviewer was "' + key +
      '" (its brief, for context only: ' + B + '/' + key + '.md). Findings to refute:\n' + JSON.stringify(rev.findings, null, 1)
    return agent(p, { label: 'refute:' + key, phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(v => ({ key, review: rev, verdicts: v ? v.verdicts : null }))
  }
)

const confirmed = []
REVIEWS.forEach((key, i) => {
  const it = reviewed[i]
  if (!it) { log(key + ': no result (agent died)'); return }
  const fs = (it.review && it.review.findings) || []
  if (it.verdicts === null) {
    log(key + ': verifier died, ' + fs.length + ' findings passed on as unverified')
    fs.forEach(f => confirmed.push(Object.assign({}, f, { source: key, verified: false })))
    return
  }
  const byId = {}
  it.verdicts.forEach(v => { byId[v.id] = v })
  fs.forEach(f => {
    const v = byId[f.id]
    if (v && v.confirmed) confirmed.push(Object.assign({}, f, { severity: v.severity || f.severity, verifier_reason: v.reason, verifier_fix: v.fix || '', source: key, verified: true }))
  })
  it.verdicts.filter(v => /^NEW-/.test(v.id) && v.confirmed).forEach(v => confirmed.push({
    id: key + ':' + v.id, title: v.reason, severity: v.severity || 'should', claim: v.reason, evidence: v.evidence || '', suggested_fix: v.fix || '', source: 'refute:' + key, verified: true,
  }))
  log(key + ': ' + fs.length + ' findings, ' + it.verdicts.filter(v => v.confirmed).length + ' confirmed')
})

const todo = confirmed.filter(f => f.severity === 'must' || f.severity === 'should')
let fix = null
if (todo.length) {
  phase('Fix')
  fix = await agent(
    brief('fix') + '\n\nThe finisher\'s report:\n' + finText +
      '\n\nFindings with "verified": false were not checked by a verifier: reproduce each one before fixing it, and skip it if you cannot.\n\nConfirmed findings:\n' + JSON.stringify(todo, null, 1),
    { label: 'fix', phase: 'Fix', schema: FIX_SCHEMA }
  )
  if (!fix) log('fix died: the final agent will find a possibly half-fixed tree; its brief tells it to re-run every repro')
} else {
  log('No confirmed must/should findings: Fix skipped')
}

phase('Final')
const digest = reviewed.map((it, i) => it
  ? { key: REVIEWS[i], summary: it.review && it.review.summary, findings: it.review && it.review.findings, verdicts: it.verdicts, not_checked: it.review && it.review.not_checked }
  : { key: REVIEWS[i], died: true })
const final = await agent(
  brief('final') + '\n\nThe finisher\'s report:\n' + finText +
    '\n\nThe three reviews with their verdicts (verdicts null = the verifier died; died = the reviewer died, so that lens was NOT checked: cover its brief\'s main points yourself as far as you can and say what you did):\n' + JSON.stringify(digest, null, 1) +
    '\n\nConfirmed findings handed to the fixer:\n' + JSON.stringify(todo, null, 1) +
    '\n\nThe fixer\'s report (null = no fixer ran, or it died: check the tree yourself):\n' + JSON.stringify(fix, null, 1),
  { label: 'final', phase: 'Final', schema: FINAL_SCHEMA }
)
return { finish: fin, reviewed, confirmed, fix, final }

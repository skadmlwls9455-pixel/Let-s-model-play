export const meta = {
  name: 'lane-fix-check',
  description: 'One lane of the second round of fixes: fix or merge in its own tree, an independent check, then repair and recheck when the check finds must/should problems',
  phases: [
    { title: 'Fix', detail: 'the lane brief, in its own tree (skipped when the fix is already done)' },
    { title: 'Check', detail: 'an independent checker plays, breaks and mutates' },
    { title: 'Repair', detail: 'only if the check finds must/should problems' },
    { title: 'Recheck', detail: 'only after a repair' },
  ],
}

const DIR = '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final'
const L = args

const FIX_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'The conclusion first, in full sentences, for a reader who has not seen the work' },
    changes: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, file: { type: 'string' }, lines: { type: 'string' }, what: { type: 'string' }, why: { type: 'string' } }, required: ['file', 'what', 'why'] } },
    decisions: { type: 'string', description: 'what you decided where the brief left a choice, and why' },
    new_text: { type: 'array', items: { type: 'string' }, description: 'every new or changed player-facing line or label, exactly as written' },
    guard: { type: 'string', description: 'the checks added, where, and the mutation table (fix reverted -> check that failed)' },
    pictures: { type: 'array', items: { type: 'string' }, description: 'full paths of screenshots' },
    suites: { type: 'array', items: { type: 'string' }, description: 'suite totals as seen, with the load note and control results' },
    left: { type: 'array', items: { type: 'string' }, description: 'seen and not fixed, with the reason' },
    not_verified: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'changes', 'decisions', 'new_text', 'guard', 'suites', 'left', 'not_verified'],
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['must', 'should', 'nit', 'owner'] },
          title: { type: 'string' },
          where: { type: 'string' },
          what: { type: 'string' },
          evidence: { type: 'string' },
          suggested_fix: { type: 'string' },
        },
        required: ['id', 'severity', 'title', 'where', 'what', 'evidence'],
      },
    },
    per_fix: { type: 'string', description: 'table: id -> reproduced before -> gone after -> guarding check that fails on revert' },
    mutations: { type: 'string', description: 'what was reverted or mutated and which check failed' },
    suites: { type: 'array', items: { type: 'string' } },
    pictures: { type: 'array', items: { type: 'string' } },
    held: { type: 'array', items: { type: 'string' } },
    not_checked: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'problems', 'per_fix', 'mutations', 'suites', 'held', 'not_checked'],
}

function head(file, label) {
  return 'Your task brief is the file ' + DIR + '/' + file + '. Read it completely, and the common brief it names, before anything else. Then do the job it describes.\n\n' +
    'Your label is "' + label + '": your scratch folder is ' + DIR + '/' + label + '/ (create it; keep notes.md there as you go).'
}
const TAIL = '\n\nWhen you are done, report in the structured form you are given. Put the conclusion first in "summary" and write for a reader who has not seen your work.'
const AGAIN = '\n\nA previous run of this same task stopped before reporting. Its notes.md and files are in that scratch folder, and its edits may already be in the tree: read the notes and `git diff` first and continue from there instead of starting over.'

async function run(promptText, name, phaseName, schema) {
  let r = await agent(promptText + TAIL, { label: name, phase: phaseName, schema, effort: 'high' })
  if (!r) {
    log(name + ' stopped without a report: one more run, continuing from its notes')
    r = await agent(promptText + AGAIN + TAIL, { label: name + ' (2)', phase: phaseName, schema, effort: 'high' })
  }
  return r
}

let fix = L.fixReport || null
if (!fix) {
  phase('Fix')
  fix = await run(head(L.fixBrief, L.fixLabel) + (L.fixNote || ''), 'fix:' + L.lane, 'Fix', FIX_SCHEMA)
  if (!fix) return { lane: L.lane, fix: null, note: 'the fix agent did not report twice; nothing was checked' }
}

phase('Check')
const reportNote = '\n\nThe fix agent\'s report:\n' + JSON.stringify(fix)
const check = await run(head(L.checkBrief, L.checkLabel) + (L.checkNote || '') + reportNote, 'check:' + L.lane, 'Check', CHECK_SCHEMA)

let repair = null, recheck = null
const serious = check && Array.isArray(check.problems) ? check.problems.filter(p => p.severity === 'must' || p.severity === 'should') : []
if (serious.length) {
  phase('Repair')
  const rp = head(L.fixBrief, 'repair-' + L.lane) + (L.fixNote || '') +
    '\n\nThis is a REPAIR round, not the first fix. The work described in the brief is already in the tree ' + L.tree + ' (uncommitted; see `git diff` and `git status`). An independent checker examined it and found the problems below. Fix every problem marked "must" or "should" (reproduce each first, fix it in the smallest way, and add or extend a check so that it fails without your repair); fix a "nit" only if it is trivial and safe; leave "owner" items alone. Everything else in the brief still applies (stay inside your lane, do not commit, put evidence files back, do not wait for a quiet machine).\n\n' +
    'The checker\'s problems:\n' + JSON.stringify(check.problems) + '\n\nThe first agent\'s report:\n' + JSON.stringify(fix)
  repair = await run(rp, 'repair:' + L.lane, 'Repair', FIX_SCHEMA)
  if (repair) {
    phase('Recheck')
    const rc = head(L.checkBrief, 'recheck-' + L.lane) + (L.checkNote || '') +
      '\n\nThis is a RECHECK after a repair. Use the scratch folder ' + DIR + '/recheck-' + L.lane + '/. First confirm, one by one, that each problem the first checker reported is really gone (reproduce the old problem on a copy without the repair if you can, then show it gone); then check that the repair broke nothing else (the whole job in the brief, at a lighter depth where the first check already covered it and the code did not change).\n\n' +
      'The first checker\'s problems:\n' + JSON.stringify(check.problems) + '\n\nThe repair agent\'s report:\n' + JSON.stringify(repair) + '\n\nThe first agent\'s report:\n' + JSON.stringify(fix)
    recheck = await run(rc, 'recheck:' + L.lane, 'Recheck', CHECK_SCHEMA)
  }
}
return { lane: L.lane, fix, check, repair, recheck }

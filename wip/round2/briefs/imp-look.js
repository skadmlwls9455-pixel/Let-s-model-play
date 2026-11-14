export const meta = {
  name: 'import-fix-look',
  description: 'Independent look at the one-line import fix before the deploy gate (code + play), each must/should re-tested by a skeptic',
  phases: [
    { title: 'Verify', detail: 'two lenses on the import fix' },
    { title: 'Confirm', detail: 'one skeptic per must/should finding tries to reproduce it on a fresh copy' },
  ],
}

const DIR = '/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final'

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'The conclusion first, in full sentences, for a reader who has not seen the work' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short id, unique within this report, prefixed with the lens letter' },
          severity: { type: 'string', enum: ['must', 'should', 'nit', 'owner'] },
          title: { type: 'string' },
          where: { type: 'string', description: 'file:line and/or the screen' },
          what: { type: 'string', description: 'what happens versus what should happen' },
          repro: { type: 'string', description: 'exact steps or the script path that reproduces it' },
          evidence: { type: 'string', description: 'output, numbers, screenshot paths' },
          confirmed_by_running: { type: 'boolean' },
          caused_by_fix: { type: 'string', description: 'yes / no (also on production f2c93f1 or on 3f1a51f) / not tested' },
          suggested_fix: { type: 'string' },
        },
        required: ['id', 'severity', 'title', 'where', 'what', 'evidence', 'confirmed_by_running', 'caused_by_fix'],
      },
    },
    checked_ok: { type: 'array', items: { type: 'string' }, description: 'situations you tested that held, one line each' },
    not_checked: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'findings', 'checked_ok', 'not_checked'],
}

const VERDICT = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reproduced: { type: 'boolean', description: 'true only if you saw the defect happen yourself' },
    severity: { type: 'string', enum: ['must', 'should', 'nit', 'owner', 'not-a-defect'], description: 'your own rating after testing' },
    caused_by_fix: { type: 'string', description: 'yes / no (same on 3f1a51f or production f2c93f1) / not tested' },
    evidence: { type: 'string', description: 'what you ran and what you saw (paths, output)' },
    cause: { type: 'string', description: 'the cause in the code if you found it (file:line), else empty' },
    fix: { type: 'string', description: 'the smallest fix you would make, else empty' },
  },
  required: ['id', 'reproduced', 'severity', 'caused_by_fix', 'evidence'],
}

function prompt(label, lensName, again) {
  return [
    'Your task brief is the file ' + DIR + '/imp-review.md. Read it completely, and the common brief it names, before anything else. Then do the job it describes. Your lens is "' + lensName + '".',
    'Your label is "' + label + '": your scratch folder is ' + DIR + '/' + label + '/ (create it; keep notes.md there as you go). Your tree copy goes in /dev/shm/' + label + '.',
    again ? 'A previous run of this same task stopped before reporting. Its notes.md and files are in that scratch folder: read them first and continue from there instead of starting over.' : '',
    'When you are done, report in the structured form you are given. Put the conclusion first in "summary" and write for a reader who has not seen your work. Report every finding you confirmed; do not drop the small ones, mark them "nit".',
  ].filter(Boolean).join('\n\n')
}

async function lens(l) {
  let r = await agent(prompt(l.label, l.lens, false), { label: l.name, phase: 'Verify', schema: SCHEMA, effort: 'high' })
  if (!r) {
    log(l.name + ' stopped without a report: one more run, continuing from its notes')
    r = await agent(prompt(l.label, l.lens, true), { label: l.name + ' (2)', phase: 'Verify', schema: SCHEMA, effort: 'high' })
  }
  return r
}

function confirmPrompt(lensName, f) {
  return [
    'Read ' + DIR + '/COMMON3.md first (the project, the hard lines, how to run things, the disk rule), then ' + DIR + '/imp-review.md (what changed and which tree to copy; never run anything inside /home/user/ppolppol-base2).',
    'You are a skeptic. Another verifier (lens "' + lensName + '") reported the finding below about the import fix. Reproduce it yourself, independently, on your own copy in /dev/shm/confirm-' + f.id + ' (delete it when done). Do not trust its evidence: run its repro if there is one, and then your own simplest repro. If you cannot make it happen, say reproduced=false and what you tried. If it happens, rate it yourself (it may be smaller or bigger than claimed), check whether the tree before the fix (git -C /home/user/ppolppol-base2 archive 3f1a51f | tar -x -C <dir>) and production f2c93f1 (git -C /home/user/ppolppol-verify2 archive f2c93f1 | tar -x -C <dir>) behave the same, find the cause in the code if you can, and say the smallest fix. A behaviour that is the owner\'s explicit decision (COMMON3.md, the docs) is not a defect.',
    'The finding:\n' + JSON.stringify(f, null, 1),
    'Report in the structured form you are given, with id = "' + f.id + '".',
  ].join('\n\n')
}

const LENSES = [
  { label: 'imp-code', lens: 'code', name: 'import:code' },
  { label: 'imp-play', lens: 'play', name: 'import:play' },
]

const out = await pipeline(
  LENSES,
  l => lens(l),
  async (r, l) => {
    if (!r) return { lens: l.name, report: null, verdicts: [] }
    const serious = (r.findings || []).filter(f => f.severity === 'must' || f.severity === 'should')
    if (!serious.length) return { lens: l.name, report: r, verdicts: [] }
    log(l.name + ': ' + serious.length + ' must/should finding(s) go to a skeptic each')
    const verdicts = await parallel(serious.map(f => () =>
      agent(confirmPrompt(l.name, f), { label: 'confirm:' + f.id, phase: 'Confirm', schema: VERDICT, effort: 'high' })))
    return { lens: l.name, report: r, verdicts: verdicts.filter(Boolean) }
  },
)
return out.filter(Boolean)
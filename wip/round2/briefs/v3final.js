export const meta = {
  name: 'final-look-deploy2',
  description: 'Final independent look at the three lanes merged since the verified tree (code + play), each must/should re-tested by a skeptic',
  phases: [
    { title: 'Verify', detail: 'two lenses on the final tree' },
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
          suggested_fix: { type: 'string' },
        },
        required: ['id', 'severity', 'title', 'where', 'what', 'evidence', 'confirmed_by_running'],
      },
    },
    untested_behaviours: { type: 'array', items: { type: 'string' }, description: 'behaviours of the second deploy that no repo test covers (code lens); may be empty' },
    suites: { type: 'array', items: { type: 'string' }, description: 'suites you ran and their totals as seen' },
    checked_ok: { type: 'array', items: { type: 'string' }, description: 'things you tested that held, one line each' },
    not_checked: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'findings', 'checked_ok', 'not_checked'],
}

const VERDICT = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reproduced: { type: 'boolean', description: 'true only if you saw the defect happen yourself on the tree' },
    severity: { type: 'string', enum: ['must', 'should', 'nit', 'owner', 'not-a-defect'], description: 'your own rating after testing' },
    on_production_too: { type: 'string', description: 'yes / no / not tested: does production f2c93f1 behave the same?' },
    evidence: { type: 'string', description: 'what you ran and what you saw (paths, output)' },
    cause: { type: 'string', description: 'the cause in the code if you found it (file:line), else empty' },
    fix: { type: 'string', description: 'the smallest fix you would make, else empty' },
  },
  required: ['id', 'reproduced', 'severity', 'on_production_too', 'evidence'],
}

function prompt(file, label, again) {
  var lensName = label === 'v3-code' ? 'code' : 'play'
  return [
    'Your task brief is the file ' + DIR + '/' + file + '. Read it completely, and the common brief it names, before anything else. Then do the job it describes. Your lens is "' + lensName + '".',
    'Your label is "' + label + '": your scratch folder is ' + DIR + '/' + label + '/ (create it; keep notes.md there as you go).',
    again ? 'A previous run of this same task stopped before reporting. Its notes.md and files are in that scratch folder: read them first and continue from there instead of starting over.' : '',
    'When you are done, report in the structured form you are given. Put the conclusion first in "summary" and write for a reader who has not seen your work. Report every finding you confirmed; do not drop the small ones, mark them "nit".',
  ].filter(Boolean).join('\n\n')
}

async function lens(file, label, name) {
  let r = await agent(prompt(file, label, false), { label: name, phase: 'Verify', schema: SCHEMA, effort: 'high' })
  if (!r) {
    log(name + ' stopped without a report: one more run, continuing from its notes')
    r = await agent(prompt(file, label, true), { label: name + ' (2)', phase: 'Verify', schema: SCHEMA, effort: 'high' })
  }
  return r
}

function confirmPrompt(lensName, f) {
  return [
    'Read ' + DIR + '/COMMON3.md first (the project, the hard lines, how to run things, the disk rule). Where it names the tree /home/user/ppolppol-verify2 at 6d03faf, read /home/user/ppolppol-verify3 (the final tree) instead; its lane 9 is now in the tree. The final-look brief is ' + DIR + '/v3-final.md.',
    'You are a skeptic. Another verifier (lens "' + lensName + '") reported the finding below about the second deploy in /home/user/ppolppol-verify3 (read-only: work on your own copy in /dev/shm or in ' + DIR + '/confirm-' + f.id + '/, and delete bulky copies when done). Your job is to reproduce it yourself, independently, before anyone spends time fixing it. Do not trust its evidence: run its repro if there is one, and then your own simplest repro. If you cannot make it happen, say reproduced=false and what you tried. If it happens, rate it yourself (it may be smaller or bigger than claimed), check whether production f2c93f1 behaves the same (an untouched copy: git -C /home/user/ppolppol-verify2 archive f2c93f1 | tar -x -C <dir>), find the cause in the code if you can, and say the smallest fix. A behaviour that is the owner\'s explicit decision (COMMON3.md lanes 7 to 9, the docs) is not a defect.',
    'The finding:\n' + JSON.stringify(f, null, 1),
    'Report in the structured form you are given, with id = "' + f.id + '".',
  ].join('\n\n')
}

const LENSES = [
  { file: 'v3-final.md', label: 'v3-code', name: 'final:code' },
  { file: 'v3-final.md', label: 'v3-play', name: 'final:play' },
]

const out = await pipeline(
  LENSES,
  l => lens(l.file, l.label, l.name),
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

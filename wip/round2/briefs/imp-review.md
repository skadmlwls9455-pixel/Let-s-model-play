# One small fix before the second deploy — the import path, looked at independently

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first (the project,
the hard lines, how to run things, the disk rule, the severity scale). Where it names the tree
`/home/user/ppolppol-verify2` at `6d03faf`, read **`/home/user/ppolppol-base2`** instead (see below).

## What changed

The final independent look before the second deploy (tree `3f1a51f`) found no must or should. It found two small
import nits, and the lead fixed them in one line of `importJSON` in `js/app.js` (the whole diff, test included, is
`/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/imp-fix.diff`):

- **C-1:** while the octopus had followed the player upstairs (`octWithMe()` true: an awake window after a turn, or a
  stay-home turn), importing a save whose octopus is napping made it fall asleep upstairs, at the attic blanket's
  coordinates inside the upstairs room. The rule (owner, 11-13): a sleeping octopus is always on the attic blanket.
- **C-2:** after an import, this tab's old in-memory awake window (the rest timer, `rest`, `REST_KEY` in
  sessionStorage) was kept, although it belongs to the record that was replaced.

The fix, just before `octInitial()`: `clearRest(); if (octWithMe() && typeof scene.octDown === 'function')
scene.octDown();`. Compare `restDown()` (`js/app.js` ~1414) and `sleepNow` (~1403), which do the same and then
`octPlace('blanket')`; here `octInitial()` places the octopus from the imported record instead. The new smoke check
Z 5-8 (`'Z-5g'` in `tools/smoke.js`) replays C-1/C-2 and fails without the fix (verified: 20 passed, 1 failed).

## The tree

`/home/user/ppolppol-base2` holds the fix as uncommitted changes on top of `3f1a51f` (the lead commits it while you
work; the content does not change). **Never run anything inside it, never write there** — the lead's full gate runs
from that folder right after you. Make your own copy: `mkdir /dev/shm/<label> && (cd /home/user/ppolppol-base2 &&
git ls-files -z | grep -zv '^audio/' | xargs -0 -I{} cp --parents {} /dev/shm/<label>/)`, then link
`node_modules` (`ln -s /home/user/Let-s-model-play/node_modules`) and `audio/` (`ln -s /home/user/ppolppol-base2/audio`).
Delete the copy when you are done. One browser at a time.

## Your lens

- **code:** read `importJSON` whole, and what it calls and what reacts to it: `clearRest`, `octInitial`, `syncRest`,
  `restDown`, `sleepNow`, `on.octUp`, the storage listener and the import guard (`importSeen`, `importAt`), the mirror
  line, and in `js/scene3d.js` `octUnmountLoft` (`octDown`), `octUp`, `finishWalk`. Then go through the import
  situations: where the player is (attic, upstairs, play room, outside), where the octopus is in this tab (with the
  player upstairs, in the attic awake or asleep, walking to the blanket, away on a walk), and what the imported record
  holds (napping, awake, a walk in progress, a stay-home turn in progress, a turn that ended moments ago so an awake
  window is due, an old turn). For each, say what should happen and whether the code does it. Confirm every doubt
  with a small runnable check in your copy before you report it. Also: can `scene.octDown()` here leave app-level
  state (mirror line, saved anchor, `rest`) out of step with the scene?
- **play:** on a phone (360x740, touch), drive your copy through the same situations with real imports (settings
  sheet → 불러오기 with a file, and `APP.importJSON` for the odd ones), going up and down the stairs before and after.
  Look at every screenshot yourself: where the octopus is, the mirror line upstairs, the nap label, the walk card.

## Report

Each finding: severity (COMMON3.md), title, where, what happens versus what should, the probe (path) and evidence.
Say whether the same happens on production `f2c93f1` (an untouched copy: `git -C /home/user/ppolppol-verify2 archive
f2c93f1 | tar -x -C <dir>`) — a defect the fix did not cause still matters, but say so. No finding is fine. List
what held in `checked_ok`.

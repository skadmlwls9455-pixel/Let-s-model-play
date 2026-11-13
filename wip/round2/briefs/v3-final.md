# Final look before the second deploy — what changed since the verified tree, all together

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first (the project,
the hard lines, how to run things, the disk rule). Where it names the tree `/home/user/ppolppol-verify2` at `6d03faf`, read
**`/home/user/ppolppol-verify3` at FINAL_SHA** instead (its lane 9 is now in the tree). Your task message names your label (scratch folder) and your lens.

## What you look at

The tree **`/home/user/ppolppol-verify3`** (detached at **FINAL_SHA**, read-only for you; copy it to `/dev/shm` to
mutate or to run suites that rewrite evidence files). An independent verification of the whole second deploy was
done on **`6d03faf`** (reports `…/scratchpad/final/report-v2-*.json`). Since then three lanes were fixed, each checked
on its own, and merged together:

1. **owner3** (`0655eed`): when a turn ends while the octopus is upstairs it stays there until the player goes down;
   a sleeping octopus is always on the attic blanket (`on.octUp`, `sleepNow`, `syncRest`, `finalPose` in `js/app.js`);
   scenario `Z` part 5, `Q21`.
2. **honest** (`bb8d87a`): code-written lines no longer say what the octopus feels (petting bubble '…', scene
   description '통통 뛰고 있어', nap label '자는 중' only, the far-sea door dialog '가 보자고 했어'); scenario `A-2`.
3. **v2** (`fix-v2`): a done '선물 상자에서 하나 내밀기' slot from production keeps its point like a done '사흘
   들어오기' (`week.keptIds`, `oldDone`, `weekState`, `weekDoneN`), the import guard lasts 1 s, the salon colour
   order, the weekly gift wording, an unknown-colour harvest toast, the claim button at 320 px, the log after
   midnight, reset clears the rest timer; scenarios `Q`, `X`, `tools/test-salon.js`.

`git -C /home/user/ppolppol-verify3 diff 6d03faf HEAD -- js css index.html` is the product change you look at
(skip `wip/`).

## Your lens

- **code:** read that diff as one change. Where do the three lanes touch the same state (the weekly list and its
  save during a turn upstairs; the storage listener and `syncRest`; the day change that both the log re-render and
  the rest window react to; the import guard and the weekly repair)? Confirm each defect with a small runnable
  check before you report it. Also say which new behaviour has no test.
- **play:** play it on a phone (360x740 and 320x568, touch) with a production save (build one by playing
  `f2c93f1` from an untouched copy served on the same origin): a week holding the gift task done and not done, a
  week change, a walk, a stay-home turn that ends while you are upstairs, going down, petting, the nap label, the
  garden during a walk, two tabs. Look at every screenshot yourself.

## Report

Each finding: severity (COMMON3.md), title, where, what happens versus what should, the probe (path) and evidence.
No finding is fine. List what held in `checked_ok`. Keep the load low (one browser at a time) and delete your copies.

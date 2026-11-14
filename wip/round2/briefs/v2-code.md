# Verify the second deploy, lens 1 — read the code across lanes

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first.
Your label (scratch folder): `v2-code`.

You are an independent code reviewer. Nine lanes were written and checked one at a time; you read them **together**
and look for what breaks where they meet. Confirm each defect with a small executable check (node for pure logic, a
short Playwright script when it needs the page) before you report it.

## What to read

`git -C /home/user/ppolppol-verify2 diff f2c93f1 HEAD -- js css index.html` hunk by hunk, each with enough of the
surrounding code to know what it plugs into. `git log --first-parent f2c93f1..HEAD` and `git show <merge>^2` per
lane help to see what each lane meant to do; the lane reports (COMMON3.md) say what each checker already covered.

## Where lanes meet (look here first)

1. **The weekly list and everything that feeds it.** `weekState` (same-week repair of unknown or removed slots,
   `week.kept`, `oldDone`, the `due` computation at the week change, the new-week fallback), `weekDoneN`,
   `weekClaim`, `renderBagChip` (it now also calls `plotLabels`), `questMark` call sites (the 'ask' count with the
   waking press, garden actions, the loft and look tasks), the day gift (`dailyGift` from the minute timer and from
   visibility). Can the gift be paid twice, lost, or counted from the wrong week? Can `kept` be set twice (a reload,
   two tabs, a tab on the old build writing the 'days' slot back)? What happens to `kept` at the week change?
2. **Saves across tabs.** The storage listener with the new `lastSeen` / `importSeen` guard (garden nits lane),
   `takeRemote` / `adoptRemote`, `syncRest` (owner lanes), `syncFromStore`, `importJSON`, `resetAll`. Read them as
   one system: which writes can a tab drop now that it did not drop before, and can a dropped write be written back
   over a newer one? Clock moved back, a file exported on a device whose clock ran ahead, two tabs closing.
3. **The octopus's rest and the upstairs room.** `restPhase`, `restTick`, `watching`, `armRest`, `finalPose`,
   `restDown`, `syncRest`, `on.octResting`, `on.octUp`, `octMountLoft` / `octUnmountLoft`, `openSalon`'s guard,
   `invite` and the 'ask' count. Read them as a truth table over: where the player is (attic, loft, outside, play
   room), where the octopus is (attic, loft, out), its state (awake, rest awake window, nap, asleep at night), a turn
   running or not, a reload, another tab. Any state where the octopus is asleep upstairs, follows when it must not,
   vanishes in view, is woken, or the mirror opens / stays shut wrongly?
4. **The garden.** `plotView`, `plotLabel(s)`, `gardenAct` (water clamp, harvest, unknown colour), `userState`'s
   normalisation (entries without a colour, more than three entries), `pick`'s exterior branch (octopus first, then
   plots, the off-screen fallthrough), `setGarden` / `setPlayerDye` early returns (can a real change be skipped
   because the key compares equal?).
5. **The intro and the scene.** `buildSky` (bank cap, `dn`, the under panel, `CLOUD.gap`), `skyCut`, `INTRO.pass`,
   `js/intro.js` `setSky` (now rewrites a gradient and an 8-layer box-shadow; how often?), `css/intro.css`, the
   cleanup on finish, skip, resize, reduced motion and the 2D fallback. Does anything stay behind after the intro
   (CSS variables, meshes, listeners)? Per-frame allocations or DOM writes during play?
6. **Everything new that runs every frame or every minute**: list it and its cost.
7. **The tests.** `git diff f2c93f1 HEAD -- tools/` : list every check removed or weakened or whose number changed,
   and say whether the new expectation is right. Then list behaviours in the deploy-2 diff that no test covers.
8. Run `npm test` and the font check on your copy and report the totals.

## How to report

Each finding: severity (COMMON3.md), a title, file:line, the reasoning in two or three sentences, the check you ran
and its output (keep the script in your scratch folder), and the fix you suggest. Separate clearly what you
confirmed by running from what you only read. Put behaviours without a test in `untested_behaviours`.

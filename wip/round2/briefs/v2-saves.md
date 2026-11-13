# Verify the second deploy, lens 3 — players' saves survive the update

Read `/tmp/claude-0/-home-user/779b4de3-ceb6-5233-b661-33f83b7682a5/scratchpad/final/COMMON3.md` first.
Your label (scratch folder): `v2-saves`.

Players have saves made by production `f2c93f1`. Hard line 10: an update never loses or corrupts what a save had.
You build real saves with the production code, open them with the new build, and compare.

## Build saves with production

Serve an untouched copy of `f2c93f1` and a copy of the tree under two paths of one static server (one origin, one
`localStorage`). With the production build, play (or seed and then let production itself rewrite) at least these
states, and keep each save as a JSON file:
- a fresh player after the first day gift; a player with several days, shells, seeds, dyes, a poster album,
  furniture moved, a colour chosen, the salon asked today;
- a week in progress whose list holds "이번 주에 사흘 들어오기", done and not done; a week with five done and the
  gift not claimed; the same on the last day of the week (Sunday) so the update happens across the week change;
- a garden with a seed, a sprout watered today, a flower, and an empty plot; dyes from a harvest;
- the octopus out on a walk (a turn running when the page closed), asleep, in its rest after a turn, upstairs;
- a save exported with the production export and one made by "전체 초기화".

## Open them with the new build

For each save: open with the new build (reload, as a returning player would), then compare field by field with
what production saved (`localStorage` before and after, the screens: bag chip, 살림 sheet, weekly list, garden
outside, album, the octopus's place and state). Every difference must be intended by a lane (say which) and must
not drop anything the player had. Then play one minute and reload again: stable?

Also:
- **A tab left open on the old build** while the new build loads in another tab of the same origin (this happens on
  every deploy): let the old tab keep writing (a day gift, a weekly action, a walk). What does each tab end up
  with? Can the old tab write back a removed weekly slot after the new tab repaired it (and set `week.kept`), so the
  week counts twice or loses a point? Can it undo the new build's repairs forever?
- **Import / export**: export from the new build, import into a fresh new build; import a production export into the
  new build; import with a `lastSeen` in the future (a device whose clock ran ahead) and then do a reset in another
  tab; damaged files (garden entries without a colour, more than three garden entries, a week with unknown ids).
- **Reset** ("전체 초기화") in the new build: everything new (week, kept, garden labels, rest state) cleared.

## How to report

Each finding: severity (COMMON3.md), a title, the save file (path), what production had versus what the new build
shows or stores, exact steps or the probe script, and evidence. List every save you tested in `checked_ok` with one
line on what held.

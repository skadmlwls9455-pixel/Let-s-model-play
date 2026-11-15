# Lane K-D — Integration check, captures and docs (lead runs this after K-A, K-B, K-C merge)

## Files

- `docs/COOK_PROTO.md`
- `docs/COOK_STICKERS.md`
- `README.md`
- `docs/shots/cook/`

## Instructions

After A, B and C are merged on one branch, run the final spec section 16 checklist once: npm test, npm run test:slow (or push and read CI), python3 tools/subset-fonts.py --check.

Captures: generate those listed in spec 16 at 360x740@2 and 320x568@2 (plus 412x915@2.625 tap-start and result, and the embed at 360x740) into docs/shots/cook/. Delete the outdated 01-09 files that show the counter and the title tags.

Update docs:
- COOK_PROTO.md:
  - §0 (open starts cooking, no counter, zero text, plate + icons);
  - §1 files;
  - §3 (same judgments, physical sizes at 4-5x);
  - §5 (layout formula, HUD, stations, slides, focus, reduced motion);
  - §5.1 (REV2 t);
  - §6 (potOld);
  - §7 (refit, live fields, auto);
  - §8 (pick at open and again);
  - §11 (Cooking Mama differences; stickers per the owner's Q1 answer, and 'no octopus appears' amended accordingly);
  - §12 (tests and captures);
  - §14.
- COOK_STICKERS.md: layer placement and visibility rule.
- README.md:47 (cooking now vibrates on tap, heat, flip landing, cut and plate) and :99 (kitchen description).

Do not edit code. Report every seam bug found to the owning package (A/B/C) with file:line. Write the owner report in Korean: conclusion first, 반말, short, with 360x740 screenshots.

## Acceptance

- Checklist 16 fully ticked.
- npm test and the slow suites (or CI) are green; the font subset reports stale: none.
- docs/shots/cook holds the new captures and none of the old counter or title-tag ones.
- COOK_PROTO and README describe exactly the shipped behaviour; no stale mention of the counter, title tag, name tag or '돌아가기' remains.
- Any seam bugs are reported to their owners and fixed before the report goes to the owner.

# T-Spin Dojo: project context

A record of how this project was built: your prompts, the sources consulted, design decisions, verification results and open caveats. This file is for you and is not part of the published site.

- **Project folder:** `C:\Claude\TetrisExercise`
- **Published (private) page:** https://claude.ai/artifact/MohasxQyrSBjQisjaF1skh
- **Status at time of writing:** single-page static site (no build step), published as version 1.

---

## 1. Your prompts (verbatim, in order)

1. > I want to design a web app for desktop browser that will allow a user to memorize typical setups for T-spin doubles in tetris.  Should follow modern Tetris rules, have a teaching mode or page for the setups, and a playable exercise mode where it will set up typical scenarios where T-spin doubles can be done so the user can complete them.  Do not use the name tetris in the page, as it is copyright protected.  You'll need an original name.
2. > In practice mode, can you make the user create the setup by dropping more than one piece before the T?  Reference this page and the pages for Double overhang and double base https://harddrop.com/wiki/T-Spin_Double_Setups
3. > Can you suggest some more names for the site that use "T-Spin" instead of "Twist"
4. > I like T-Spin Dojo, is that taken on the internet anywhere?
5. > Yes, rename the site to T-Spin Dojo
6. > I don't think the hold key does anything in practice mode.
7. > In a typical modern tetris game, is there an amount of time that a piece needs to sit in its final location before it stays?  Can we implement that in practice mode, maybe have a check box to enable/disable it?
8. > Where did you get the info about how tetris works?  And did you copy any code from anywhere?
9. > Can you check the rules and mechanics against sources?
10. > Can you add "build" cases to the learn tab instead of just spins
11. > I think the "Why it works" section is confusing.  Can we remove it?
12. > Can you publish the site so I can return to it later?
13. > Can you save any context you used to make this, including my prompts, to a markdown file?

---

## 2. What was built

| Area | Summary |
|---|---|
| **Learn tab** | Animated lessons. *Spin setups* show a T rotating into a prepared pocket. *Build it first* lessons show one to three pieces being placed, then the T-spin. Play/pause, step, mirror, per-step key list, "Practice this" button. |
| **Practice tab** | Playable drills with modern rules. Drill types: **Build + spin** (default), **Spin only**, **Mixed**. Hint (`H`, twice for the target), retry, next, undo (build drills), weighted scenario selection, per-drill mastery stats. |
| **Rules engine** | 10×20 field (plus a 2-row hidden buffer), 7-piece bag, Super Rotation System with wall kicks, hold, ghost, hard/soft drop, DAS/ARR, lock delay, 3-corner T-spin detection with mini rules. |
| **Solver** | Breadth-first search over real inputs (move, rotate with kicks, soft drop, hard drop). Finds the shortest input sequence for any piece or T-spin. Used for lessons, hints and validation. |

### File map

| File | Purpose |
|---|---|
| `index.html` | Page structure: Learn and Practice pages, dialogs (controls, build plan). |
| `css/style.css` | Dark theme, layout, narrow-screen rules. |
| `js/engine.js` | Board, pieces, SRS, kicks, T-spin detection, solver (`solvePiece`, `solveT`), build search (`buildPlan`, `allPlans`, `canTSD`, `holeCount`). Works in browsers and Node. |
| `js/setups.js` | Catalog: 5 spin setups (`TW_SETUPS`) and 10 build drills (`TW_BUILDS`). Data only. |
| `js/app.js` | UI: lessons, practice game loop, input handling, stats, options. |
| `.claude/launch.json` | Dev server entry (`python -m http.server 8123`). |

Run locally by opening `index.html` directly (no modules, so it works from disk) or serving the folder.

### Spin setups (Learn + Practice)
`edge` Edge Overhang · `floor` Open-Floor Overhang · `ledge` Ledge Kick · `stair` Staircase · `plateau` Plateau.
Boards are stored as rows of `X`/`.`. Solutions are **not** stored: the solver finds them for the board and its mirror.

### Build drills (Practice + Learn)
Each is a bare stack (`G` = filled) plus a fixed piece order ending in the T. Every piece is required (verified: removing any piece makes a T-spin double impossible).

| Id | Name | Pieces |
|---|---|---|
| `b-flat-ledge` | Level the Floor, Raise the Ledge | I, J |
| `b-square-ledge` | Square Then Ledge | O, L |
| `b-notch` | Fill the Notch | S, L |
| `b-zigzag` | Zig-Zag Base | Z, J |
| `b-wall-base` | Wall Base | O, Z |
| `b-shallow` | Shallow Base | Z, J |
| `b-wide` | Wide Floor | I, L |
| `b-t-base` | T as a Builder | T, L (changed after a first version produced a 6-hole stack) |
| `b-three-floor` | Three-Piece Floor | I, O, J |
| `b-three-mixed` | Three-Piece Mix | I, J, L |

Mirroring a drill also swaps J↔L and S↔Z so it stays solvable.

---

## 3. Key design decisions

- **Name:** original name "Twistwise" first, then renamed to **T-Spin Dojo** at your request. The protected game name is not used anywhere on the site. No official artwork, logos or music.
- **No stored solutions.** Lessons, hints and "show solution" all come from search, so they stay consistent with the rules and with mirrored boards.
- **Build validation is flexible.** After each build piece locks, the engine checks whether a T-spin double is still reachable with the remaining pieces (any order, since Hold can reorder). If not, the drill warns and offers Undo (`U`). Any valid build is accepted, not one scripted answer.
- **Hold in build drills.** First version disabled Hold there. You reported it did nothing, so it now works: pieces may be used in any order, Hold state is restored by Undo, and a non-build piece (such as an early T) is flagged.
- **Lock delay:** 0.5 s with 15 move resets, as its own checkbox ("Lock delay"), on by default. Previously it only ran when gravity was above Off.
- **Solver action names:** the solver's `hard` action means "fall to the resting spot without locking". In play that is holding soft drop (`↓`), because `Space` hard-drops and locks. Lessons label it "Soft drop to the floor".
- **Lesson reference build:** when several builds work, the lesson shows the one leaving the fewest holes.
- **"Why it works" removed** from Learn at your request. A short note stays in build lessons ("Other builds can work too…" or "This drill has only one solution.").
- **Publishing:** the publish copy was made in the scratchpad with the outer document tags stripped and a plain title. Project files are unchanged apart from a dark colour-scheme line and narrow-screen CSS added before publishing.

### Controls
`←` `→` move (hold to slide) · `↓` soft drop · `Space` hard drop and lock · `↑`/`X` rotate clockwise · `Z`/`Ctrl` rotate counter-clockwise · `C`/`Shift` hold · `H` hint · `R` retry · `N` next · `U` undo (build drills).

### Timings
DAS 167 ms, ARR 33 ms (Guideline-recommended, changed from my original 140/35), soft drop about 60 cells/s, lock delay 500 ms, 15 resets.

---

## 4. Sources consulted

All of these were read during the session. None were copied into the project as code.

| Source | Used for |
|---|---|
| https://harddrop.com/wiki/T-Spin_Double_Setups | Overview of setup families (your reference). |
| https://harddrop.com/wiki/T-Spin_Double_Overhang_Setups | Page source read (via the wiki's raw-text view) to understand overhang setups: a prepared pocket plus one piece for the overhang. |
| https://harddrop.com/wiki/T-Spin_Double_Base_Setups | Page source read to understand base setups: building the pocket on garbage. |
| https://tetris.wiki/Super_Rotation_System | Kick tables and spawn rules, compared programmatically. |
| https://tetris.wiki/T-Spin | 3-corner rule, mini rule, 1×2-kick exception, worked examples. |
| https://tetris.wiki/Tetris_Guideline | Playfield, lock-down (0.5 s, 15 resets), hold, bag, key mapping, DAS/ARR recommendations. |
| https://tetris.wiki/Lock_delay · https://tetris.wiki/Infinity · https://tetris.wiki/Drop | Lock delay, move reset, soft drop speed range. |
| Two web searches for "T-Spin Dojo" | No website, app or trainer by that exact name appeared. This does not prove the name is free. |

Wiki page source was saved to a scratch folder outside the project and is not included in it. If you publish the site widely, check the Hard Drop wiki's content license and credit it if you wish.

**What came from memory:** the initial engine (piece shapes, kick tables, bag, 3-corner rule, lock delay values) was written from recalled knowledge of the published guideline before any source was checked. It was then verified as below.

**No code was copied** from any open-source game, tutorial or other project. The five spin setups are original designs verified by the solver. The build drills are original starting stacks, in the same spirit as the wiki's bases, and some prepared-pocket rows resemble the wiki's bases because they describe the same structure.

---

## 5. Verification performed

**Against the wiki (scripted)**
- Kick tables: 8/8 rotations match for J/L/S/T/Z and 8/8 for I.
- Piece shapes: every rotation state equals the clockwise rotation of the previous one (I, J, L, S, T, Z; O is symmetric). Spawn orientations are flat side first.
- Wiki worked examples reproduced: J 0→L resolves on kick test 5 (two cells down); T-spin double via the 1×2 kick scores as a full T-spin; proper T-spin single; mini T-spin single; no T-spin without a final rotation.

**In the browser (scripted key presses through the real input handler)**
- Spin drills: all five setups, mirrored and not, with and without messy floors, solved (30/30 and later 20/20 and 15/15 runs).
- Build drills: all ten, both orientations, placed and finished (20/20).
- Failure paths: a bad build placement is flagged, Undo restores board, stage and Hold; hint and plan dialog work; Hold works in build drills.
- Lock delay: locks after about 0.5 s resting, a move resets the timer, and it stays put when the option is off.
- Learn: 30 lessons (15 spin, 15 build) build frames and end on the T-SPIN DOUBLE banner.
- Layout: no horizontal scroll at 375 px on Learn (spin and build) and Practice.

**Not verified**
- The desktop layout at full size: the preview pane in this session was about 384 px wide, so desktop was only checked structurally through emulation.
- The published page inside the claude.ai viewer beyond it opening.
- Kick tables and T-spin rules for correctness beyond the wiki pages read (the Hard Drop SRS and T-spin pages were downloaded but not read in full).

---

## 6. Known limitations and deviations

- Pieces spawn one row lower than the original Guideline position and are not auto-dropped one row on spawn. The hidden buffer is 2 rows, not the Guideline's 20. Neither affects these drills.
- After 15 resets the timer stops resetting and the piece locks within 0.5 s. A fresh 15 resets is given when the piece falls to a new lowest row; that detail was not confirmed against a source.
- Not implemented: scoring, levels, combos, garbage, back-to-back. The drills do not need them.
- Build-drill validation ignores exact reachability: it assumes each candidate placement can be reached by dropping from above. The lesson and hint paths are checked with the real solver and all are reachable.
- Stats are stored in the browser (`localStorage`, key `twistwise.v1`, kept from the original name so saved progress survives the rename). They do not sync across browsers or devices.
- Searching for name conflicts was limited to two web searches. Before committing to "T-Spin Dojo", check domain registrars, the US trademark database and social handles.

---

## 7. Ideas not done

- More setup families from the wiki (for example the incomplete-base layouts, Drop + Line Clear overhang variants, STSD, Fin/Neo/Iso).
- A slider for lock delay time.
- A drill timer or spaced-repetition scheduling beyond the current weighting.
- Keyboard remapping and adjustable DAS/ARR.

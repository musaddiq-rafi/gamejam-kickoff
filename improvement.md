# Improvement Roadmap — Pushing "Kickoff Rush" Toward 99/100

This document maps every change needed to maximise the IUT 12th ICT FEST 2026
GameJam score (theme **KICKOFF**) across the five official judging criteria.
It is written for the current codebase (`index.html`, `css/style.css`,
`js/*.js`) so each idea is concrete and implementable.

Current estimated score: **~82/100** (Theme 20, Gameplay 21, Design 21,
Visual & Audio 12, Video 8). The plan below targets **~99/100**.

---

## 1. THEME — 20 → 25 (weight 25%)

Make "KICKOFF" impossible to miss. Judges score what they *see and read*, not
what you intend.

- **Rebrand the power-up as "KICKOFF BLAST"** instead of "FREE KICK".
  - Files: `js/game.js` → `awardFreeKick()` / `shootFreeKick()`; change
    `fk1.textContent = 'FREE KICK!'` to `'KICKOFF BLAST!'`; update `#fkReady`
    copy in `index.html` ("KICKOFF READY — press SPACE").
  - Show a big "KICKOFF!" word-mark on the intro banner alongside
    "REFEREE WHISTLES" / "KICK OFF!".
- **Add a "Kickoff Meter"** that visibly fills and *is* the game's energy.
  - The existing `#fkFill` charge bar already fills every 50 stars. Renaming
    it "KICKOFF METER" and binding a short on-screen label cements the theme.
- **Team / Kickoff select at the main menu.**
  - Add a row of team cards (kit color + name) on `#worldScreen` or a new
    `#teamScreen`. Pass the chosen colors into `K.Player.create()` so the
    player's jersey changes. Ties "kickoff" = the start of a match/season.
- **One-line lore on the menu:** *"The season kicks off now — run the ball home."*
  Keeps the theme in the judge's mind before they even play.

---

## 2. GAMEPLAY — 21 → 25 (weight 25%)

Depth, score systems, and variety. The engine already supports stars, two
obstacle types, and the power run — extend it.

- **Combo / multiplier system (highest impact).**
  - Track consecutive star pickups (reset on miss/near-miss). Map combo →
    multiplier (e.g. x1 at <10, x2 at 10–24, x3 at 25–49, x4 at 50+).
  - Apply multiplier to a **score** that is separate from distance. Currently
    `scoreEl` shows `Math.floor(distance)`. Introduce `score` that grows by
    `10 * multiplier` per star; show both `DISTANCE` and `SCORE` in the HUD.
  - Add a floating combo popup (DOM element that fades) in `checkStar()`.
- **Style bonuses (reward skill).**
  - Award bonus points for: rolling *under* a keeper, and last-second lane
    switches (switch within ~0.25s before an obstacle reaches the player).
- **More power-ups, not only the blast.**
  - *Magnet*: pulls nearby stars toward the player for 5s.
  - *Shield*: absorbs one hit (don't call `gameOver()` once).
  - *Golden Boot*: stars worth 2× for 6s.
  - Implement as a small power-up obstacle type in `spawnChunk()` (low spawn
    chance), reusing the star/HUD patterns.
- **Local leaderboard + per-world bests.**
  - `localStorage` already stores `kickoffBest`. Add a top-5 list and show it
    on the Game Over screen.

---

## 3. DESIGN — 21 → 25 (weight 25%)

Structure, onboarding, balance, menus.

- **Full menu flow.**
  - Main menu (theme explainer + team select + how-to-play) → in-game
    **Pause** (Esc / P) → **Settings** (music volume slider, SFX volume,
    mute) → **Game Over** with stats (distance, stars, best combo, score,
    leaderboard) + Restart + Change World.
  - Settings should bind to `K.Audio` gains (`musicGain`, master). Add a
    `setVolume(v)` to `js/audio.js`.
- **First-run tutorial overlay.**
  - On the first ever play (flag in `localStorage`), show a fading overlay
    with controls: "← → / A D move · ↑ / Space jump · ↓ roll · SPACE = Kickoff
    Blast". The kickoff intro already eases players in — layer the hint on top.
- **Balance pass.**
  - Confirm a always-passable lane (currently guaranteed via `freeLane`).
  - Ensure the Kickoff Blast can't be farmed: it already requires 50 stars and
    freezes rivals, which is fine — keep the 5s cap.
  - Smooth difficulty ramp: `speed = BASE_SPEED + min(22, distance/90)` is
    good; consider a soft cap so late game stays fair.
- **Accessibility / clarity.**
  - Colorblind-friendly obstacle outlines (keeper green vs rival blue is fine,
    but add a shape cue: keeper is wide/low, rival is narrow/tall).

---

## 4. VISUAL & AUDIO — 12 → 15 (weight 15%)

"Game feel" (juice) and audio richness. This is where small effort yields big
perceived-quality gains.

- **Crash juice.**
  - In `gameOver()`: add a short **camera shake** (offset `camera.position`
    randomly for ~0.3s) and a **hit-stop** (freeze `update()` for ~80ms by
    holding `dt` at 0) before showing the over screen.
- **Squash & stretch.**
  - On jump/land, briefly scale `player.scale.y` past the target then settle
    (already animates toward 0.5 when rolling; add a landing pop).
- **Ball trail + star sparkle.**
  - Add a thin `THREE.Line` or sprite trail behind the ball during the
    Kickoff Blast; add a small sparkle particle when a star is collected.
- **Particles.**
  - Confetti burst on Kickoff Blast trigger (`flashScreen` already exists —
    add a particle system). Crowd "ole" roar (procedural cheer) in
    `js/audio.js`. Goal-fireworks when the blast ends.
- **World life.**
  - Beach: animated sea plane + moving sun. Stadium: floodlight glow / subtle
    light flicker. Indoor: a **live scoreboard** mesh that updates with the
    player's distance/score.
- **UI juice.**
  - Animated HUD (pulse the star counter on pickup), combo popup text,
    smoother banner transitions in `css/style.css`.
- **Audio richness.**
  - Keep procedural Whistle (two blasts) + Goal fanfare. Add: crowd ambience
    loop, beach wave loop, distinct hit/crash, UI click. Route everything
    through `musicGain` / a master gain for the Settings volume control.

---

## 5. VIDEO (PITCH) — 8 → 10 (weight 10%)

Pure content, no code, but the cheapest 10%.

- 60–90s YouTube video. Title must include `IUT_ICT_FEST_2026`; description
  must include `#IUT_ICT_FEST_2026_GAMEJAM`.
- Show, with on-screen text: (1) the KICKOFF theme hook, (2) every mechanic
  (move/jump/roll, stars, Kickoff Blast, rivals, keeper), (3) the team select
  and menus, (4) a real gameplay clip hitting a combo + blast.
- Explain *how* the game adapts the theme in one sentence.

---

## Priority order (implementation sequence)

- **P0 (→ ~90):** combo/multiplier + SCORE HUD · team/kickoff select ·
  Pause + Settings (volume) + Game Over stats · crash camera-shake/hit-stop ·
  "KICKOFF BLAST" rebrand.
- **P1 (→ ~95):** extra power-ups (Magnet/Shield/Golden Boot) · tutorial
  overlay · live scoreboard (indoor) · crowd cheer SFX · squash & stretch.
- **P2 (→ ~99):** confetti/particles · ball trail + star sparkle · animated
  worlds (sea/sun/floodlights) · local leaderboard · polished pitch video.

## Compliance reminder (avoid a 0)

- The jam requires the **submission repository to be empty at the start of the
  Game Jam, public, and unchanged after the online round ends**.
- This dev repo already has history. For the *official submission*, snapshot
  the finished game into a **fresh, empty, public repo created at jam start**
  and freeze it after the July 20 deadline. Do not edit it afterward.
- Keep the game **keyboard-playable in a browser** (it already is; touch is
  bonus only).

---

### Quick wins checklist
- [ ] Rename FREE KICK → KICKOFF BLAST everywhere (game.js + index.html)
- [ ] Add SCORE (combo-multiplied) next to DISTANCE
- [ ] Team select cards on the menu
- [ ] Pause (Esc/P) + volume Settings
- [ ] Game Over: stats + leaderboard
- [ ] Crash shake + hit-stop
- [ ] Crowd cheer + confetti on blast
- [ ] Tutorial overlay (first run)
- [ ] Pitch video with theme mapping

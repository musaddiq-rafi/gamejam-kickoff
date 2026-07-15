# 🏆 EXTRA FEATURES — Make Kickoff Rush Unbeatable

> **Goal:** Win the IUT 12th ICT FEST 2026 GameJam Championship  
> **Theme:** KICKOFF  
> **Deadline:** July 20, 2026 (5 days remaining)  
> **Current State:** Solid 3-lane endless runner with 3 worlds, stars, free kick mechanic, referee cinematic

---

## 📊 Judging Criteria Alignment

| Criteria | Weight | Current Est. | Target | Key Features |
|----------|--------|-------------|--------|--------------|
| **Theme** | 25% | ~20 | 25 | Season mode, team select, kickoff branding |
| **Gameplay** | 25% | ~21 | 25 | Combo system, power-ups, difficulty curve |
| **Design** | 25% | ~21 | 25 | Progression, pause, tutorial, stats |
| **Visual & Audio** | 15% | ~12 | 15 | Camera shake, particles, crowd SFX |
| **Video (Pitch)** | 10% | ~8 | 10 | Showcase all features + theme |

---

## 🔥 CATEGORY 1: The Addictive Game Loop (HIGHEST PRIORITY)

These features are what keep players saying *"just one more run"* — the core of game addiction psychology.

### 1.1 ⚡ Combo & Multiplier System
**Impact: 🔴 CRITICAL | Difficulty: Medium | Criteria: Gameplay + Design**

The single most impactful missing feature. Without combos, collecting stars feels flat.

- Track **consecutive star pickups** — reset when you miss a star cluster or get hit
- Display a **combo counter** with escalating multiplier:
  - 5 stars → **x2** • 15 stars → **x3** • 30 stars → **x4** • 50 stars → **x5 MAX**
- Introduce a separate **SCORE** (distinct from distance) that grows as `10 × multiplier` per star
- Show a **floating popup** on each pickup: `+20`, `+30`, `+50` that fades up and out
- On combo break: flash the counter red and shake it briefly

> **Why it's addictive:** Players become obsessed with maintaining combos. "I was at x4 and died!" drives instant replay.

**Files to modify:**
- `game.js` → `checkStar()`: track combo, calculate multiplied score
- `game.js` → `update()`: render combo popup DOM element
- `index.html` → add combo/score HUD elements
- `style.css` → combo popup animation (`@keyframes floatUp`)

---

### 1.2 🛡️ Power-Up System (3 Types)
**Impact: 🔴 CRITICAL | Difficulty: Medium | Criteria: Gameplay**

One power-up (Free Kick) isn't enough variety. Add 3 more that spawn rarely on the track:

| Power-Up | Visual | Effect | Duration |
|----------|--------|--------|----------|
| **⚡ Speed Boost** | Blue lightning orb | +40% speed, 2× distance points | 4 seconds |
| **🧲 Star Magnet** | Purple swirl orb | Stars in adjacent lanes auto-collect | 5 seconds |
| **🛡️ Shield** | Green shield orb | Absorb ONE hit without dying | Until used |

- Spawn as glowing orbs on the track (low chance: ~8% per chunk, replacing a star slot)
- Each power-up has a distinct 3D mesh + glow color
- Active power-up shown as icon in HUD corner with timer bar
- **Shield is the most addictive** — "I have a shield, I can take risks!" changes playstyle instantly

**Files to modify:**
- New file: `js/powerups.js` → create orb meshes + effects
- `game.js` → `spawnChunk()`: chance to spawn power-up instead of some stars
- `game.js` → `update()`: apply active power-up effects
- `index.html` → power-up HUD indicator

---

### 1.3 🏅 Milestone Unlocks & Progression
**Impact: 🔴 CRITICAL | Difficulty: Medium | Criteria: Design + Gameplay**

Players need **goals beyond the current run**. This is the #1 reason people replay.

- **Distance milestones** with rewards:
  - 100m → Unlock "Beach" world (currently all unlocked — gate them!)
  - 250m → Unlock "Indoor" arena
  - 500m → Unlock "Night Stadium" variant (new 4th world — dark sky, neon floodlights)
  - 1000m → Unlock golden player skin
- **Star shop** on the menu:
  - Spend collected stars (persistent via `localStorage`) on cosmetics
  - Jersey colors (5 options: Red, Blue, Gold, Black, Rainbow gradient)
  - Ball skins (classic white, golden, neon, flame)
  - Trail effects (none, sparkle, flame, rainbow)
- Show a **"NEW UNLOCK!"** popup on the game over screen when a milestone is reached

> **Why it's addictive:** "I need 50 more stars for the golden ball" → plays 3 more games.

**Files to modify:**
- `game.js` → `gameOver()`: check milestones, award persistent stars to `localStorage`
- New file: `js/shop.js` → shop UI logic, skin application
- `player.js` → `create()`: accept color/skin parameters
- `index.html` → shop screen overlay

---

### 1.4 📊 Stats & Leaderboard
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Design**

- **Local leaderboard**: Top 5 runs stored in `localStorage`, shown on Game Over screen
  - Each entry: Distance, Score, Stars, Combo, Date
- **Session stats**: Total runs, total stars collected, total distance, highest combo
- **Personal bests per world**: "Your best on Beach: 342m"
- On Game Over, show **comparison to best**: `"23m short of your record!"`

> **Why it's addictive:** Competition with yourself. "I was SO close to my record."

---

### 1.5 🎯 Challenge System (Daily/Run Objectives)
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Gameplay + Design**

Give players micro-goals each run:

- **3 random challenges per run** (shown at kickoff):
  - "Collect 30 stars" ✓
  - "Reach 200m without getting hit" ✗
  - "Use Kickoff Blast twice" ✓
  - "Maintain x3 combo for 10 seconds"
  - "Roll under 3 keepers"
  - "Collect a Speed Boost and a Shield in one run"
- Completing challenges awards **bonus stars** (10–50 per challenge)
- Show challenge progress in a subtle HUD strip

> **Why it's addictive:** Even a bad run can feel productive — "I failed at 80m but completed 2 challenges!"

---

## 🎨 CATEGORY 2: Theme Reinforcement ("KICKOFF")

### 2.1 🏟️ Full Kickoff Cinematic (Enhanced)
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Theme**

The intro cinematic already exists but can be elevated:

- Add a **team lineup**: 3-4 players on each side at kickoff, not just 1 opponent
- The referee walks to center, places ball, blows whistle
- Camera sweeps from aerial → chase cam with a **stadium announcer text**: `"AND THE SEASON KICKS OFF!"`
- Add a brief **coin toss** animation before kickoff (a spinning coin in the air)

---

### 2.2 ⚽ "Kickoff Blast" Rebrand + Upgrade
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Theme**

Rename FREE KICK → **KICKOFF BLAST** everywhere to hammer the theme:

- `fk1.textContent = 'KICKOFF BLAST!'`
- `#fkReady` → `"⚽ KICKOFF BLAST READY — press SPACE"`
- The charge bar label: `"KICKOFF METER"` (not "FREE KICK CHARGE")
- Add **one-line lore** on the menu: *"The season kicks off now — dribble past them all."*

---

### 2.3 👕 Team Select (Kit Customization)
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Theme + Design**

Before each game, pick your team:

| Team | Jersey | Shorts | Concept |
|------|--------|--------|---------|
| **Red Devils** | 🔴 #d94f45 | ⬜ White | Classic attack |
| **Blue Lions** | 🔵 #2d4a6b | ⬛ Black | Defensive tanks |
| **Golden Eagles** | 🟡 #e0a63c | ⬛ Black | Speed demons |
| **Green Vipers** | 🟢 #2f9e8f | ⬜ White | Balanced |
| **Purple Storm** | 🟣 #9c4a86 | ⬛ Black | High risk/reward |

Each team could have a minor stat tweak (optional, for deeper gameplay):
- Red Devils: +5% base speed
- Blue Lions: Shield starts charged
- Golden Eagles: Stars worth +10%
- Green Vipers: Combo decay slower
- Purple Storm: Kickoff Blast lasts 6s instead of 5s

**Files to modify:**
- `index.html` → team select cards on `#worldScreen`
- `player.js` → `create(scene, kitColors)` accepts jersey/shorts colors
- `game.js` → pass selected team into player creation

---

### 2.4 🏟️ "Night Stadium" (4th World)
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Theme + Visual**

A dramatic 4th arena unlocked at 500m:

- Dark sky (`0x0a0e1a`), heavy fog, **neon floodlights** casting colored light
- Pitch stripes glow faintly with emissive material
- Crowd holds phone flashlights (tiny white point lights in the stands)
- The bloom post-processing gets cranked up: `bloomPass.strength = 0.6`
- **Feels completely different** from the 3 existing worlds — a "final stage" vibe

---

## 🎮 CATEGORY 3: Gameplay Depth

### 3.1 🎖️ Style Bonuses (Reward Skill)
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Gameplay**

Award bonus points for skillful play:

| Move | Condition | Bonus |
|------|-----------|-------|
| **Close Call** | Switch lanes within 0.3s of an opponent reaching you | +50 pts |
| **Limbo King** | Roll under a keeper (pass within `clearHeight` range while rolling) | +100 pts |
| **Air Master** | Collect a star while jumping | +25 pts |
| **Speed Demon** | Travel 100m without slowing (never roll) | +200 pts |

- Show a floating banner: **"CLOSE CALL! +50"** in gold text
- Track total style bonuses in stats

---

### 3.2 📈 Dynamic Difficulty Curve (Smarter Spawning)
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Gameplay + Design**

The current difficulty is `speed = BASE_SPEED + min(22, distance/90)` — linear and predictable.

Improve it:
- **Phases** with names shown on screen:
  - 0–100m: **"Warm-Up"** — sparse obstacles, wide gaps
  - 100–300m: **"First Half"** — normal density, keepers appear more
  - 300–600m: **"Second Half"** — 2-lane blocks common, shorter gaps
  - 600m+: **"Extra Time"** — maximum density, obstacles can be staggered (two rows close together)
- Show phase name briefly when transitioning: `"SECOND HALF!"` banner
- **Opponent variety**: after 300m, some rivals jog toward the player (slight forward motion) instead of standing still

---

### 3.3 🔄 "Second Chance" Mechanic
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Gameplay**

On death, offer a **one-time revival**:

- "WATCH THE REPLAY?" → Spend 25 stars to continue from where you died
- Only available once per run
- 3-second invincibility after revival
- This keeps players in longer runs and makes stars feel more valuable

---

## ✨ CATEGORY 4: Visual Juice (Game Feel)

### 4.1 📸 Camera Shake on Death
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Visual**

```javascript
// In gameOver(): shake camera for 0.3s
let shakeT = 0.3;
function shakeCamera(dt) {
  if (shakeT > 0) {
    shakeT -= dt;
    camera.position.x += (Math.random() - 0.5) * 0.4;
    camera.position.y += (Math.random() - 0.5) * 0.2;
  }
}
```

Also add **hit-stop**: freeze the game for ~80ms before showing the game over screen. This tiny pause makes death feel impactful.

---

### 4.2 🎆 Particle Effects
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Visual**

| Event | Particle Type | Description |
|-------|--------------|-------------|
| **Star Collected** | Golden sparkles | 8-12 tiny gold quads burst outward and fade |
| **Kickoff Blast** | Confetti burst | 30+ colored particles rain down from screen top |
| **Combo x3+** | Fire trail | Orange/red particles trail behind the player |
| **Death** | Smoke puff | Grey particles at collision point |
| **Shield Break** | Green shatter | Green shards fly outward when shield absorbs hit |

Implement with a simple particle pool:
- Pre-allocate 100 `THREE.Sprite` objects
- On trigger: activate N sprites with random velocity + fade
- Each frame: update position, reduce opacity, recycle dead particles

---

### 4.3 🏃 Squash & Stretch + Landing Impact
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Visual**

- **Jump launch**: Squash player (scaleY 0.7) for 1 frame, then stretch (scaleY 1.2) as they rise
- **Landing**: Brief squash (scaleY 0.8) then pop back to 1.0
- **Lane switch**: Slight lean (rotateZ ±0.15) in the direction of movement
- **Star pickup**: Stars scale up to 1.3× then vanish (pop effect)

---

### 4.4 🌊 Living Worlds
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Visual**

Make each world feel alive:

- **Beach**: Animated sea plane (vertex shader wave or simple Y oscillation), seagull sprites flying overhead
- **Stadium**: Occasional camera flash from the crowd (random white point light flicker in stands)
- **Indoor**: Live scoreboard that updates with player's actual distance/score
- **All worlds**: Crowd does a subtle "wave" (groups of stickmen bob up in sequence)

---

## 🔊 CATEGORY 5: Audio Immersion

### 5.1 🎶 Richer Procedural Audio
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Audio**

The current audio is minimal procedural beeps. Elevate:

- **Crowd ambience loop**: Low continuous noise (filtered white noise + random cheers)
  - Gets louder as combo increases
  - Erupts on Kickoff Blast activation
- **Beach wave loop**: Gentle filtered noise that cycles (LFO on filter cutoff)
- **Distinct crash sound**: Not just noise burst — add a "oof" pitch bend + crowd gasp
- **Heartbeat at high speed**: When speed > 75%, add a subtle low-frequency pulse (`40Hz`, `0.1` gain) — creates tension
- **Combo jingle escalation**: Each combo tier plays a higher-pitched star collect sound

---

### 5.2 🎵 Music Intensity System
**Impact: 🟡 HIGH | Difficulty: Medium | Criteria: Audio**

The background arpeggio is static. Make it **reactive**:

- **0–100m**: Only bass notes, slow tempo
- **100–300m**: Add melody layer, tempo increases
- **300m+**: Full arpeggio + drums (noise bursts on rhythm)
- **Kickoff Blast**: Music swells — all layers active, filter opens up
- **Near death** (after a close call): Brief music stutter/skip for tension

---

## 🎛️ CATEGORY 6: UX & Design Polish

### 6.1 ⏸️ Pause Menu + Settings
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Design**

Currently no pause. Add:

- **Esc / P** → Pause overlay with:
  - Resume button
  - Music volume slider (binds to `musicGain.gain.value`)
  - SFX volume slider (binds to `master.gain.value`)
  - Mute toggle
  - Restart button
  - Change World button
- Semi-transparent overlay, game loop frozen

---

### 6.2 📖 First-Run Tutorial
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Design**

On first play (`localStorage` flag):

- Semi-transparent overlay during the first 5 seconds of gameplay
- Animated arrows showing controls:
  - ← → for lane switching (with visual lane highlight)
  - ↑ for jump (with arrow pointing up)
  - ↓ for roll (with arrow pointing down)
  - "Collect ⭐ to charge KICKOFF BLAST" with arrow to the charge bar
- Fades out after 8 seconds or first input
- Never shown again (set `tutorialSeen = true` in `localStorage`)

---

### 6.3 📊 Rich Game Over Screen
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Design**

Current game over only shows distance, stars, and best. Expand:

```
╔══════════════════════════════╗
║        TACKLED!              ║
║                              ║
║   Distance:     342m         ║
║   Score:        12,450       ║
║   Stars:        47 ⭐        ║
║   Best Combo:   x4 (28)     ║
║   Close Calls:  3            ║
║   Kickoff Blasts: 1         ║
║                              ║
║   🏆 NEW PERSONAL BEST! 🏆  ║
║   Previous: 298m             ║
║                              ║
║   Challenges: 2/3 ✅         ║
║   Stars Earned: +47          ║
║                              ║
║   [PLAY AGAIN] [CHANGE WORLD]║
║   [SHOP]       [LEADERBOARD] ║
╚══════════════════════════════╝
```

---

## 🏁 CATEGORY 7: Competitive Edge (Stand Out From Other Entries)

### 7.1 🎬 Replay System (Killer Feature)
**Impact: 🔴 CRITICAL | Difficulty: Hard | Criteria: Gameplay + Design**

After death, show a **3-second slow-motion replay** of the moment you got tackled:

- Store last 3 seconds of game state (player position, obstacle positions)
- On death: camera zooms out, replay at 0.3× speed with dramatic zoom
- Text overlay: `"TACKLED AT 342m"`
- This is a **"wow" feature** that no other jam entry will have

---

### 7.2 🌐 Share Button
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Design**

On Game Over:
- "Share" button that copies text to clipboard:
  > *"I dribbled 342m in Kickoff Rush! 🏆 Can you beat my score? Play now: [itch.io link]"*
- Generates a shareable screenshot (canvas `toDataURL`)

---

### 7.3 🎭 Dynamic Commentary
**Impact: 🟡 HIGH | Difficulty: Easy | Criteria: Theme + Audio + Visual**

Text-based commentary that appears at the top of screen during gameplay:

- "AND HE'S OFF! Beautiful dribbling!"
- "Close call! That defender nearly got him!"
- "The crowd goes WILD! x4 COMBO!"
- "What a run! Past the 300 metre mark!"
- "KICKOFF BLAST! The pitch is his!"
- "OH NO! TACKLED! What a performance though!"

Triggered by game events, displayed as a fading banner. Makes the game feel like a **real football broadcast**.

---

## 📋 IMPLEMENTATION PRIORITY (5-Day Sprint Plan)

### Day 1 (TODAY): Core Game Loop
- [ ] Combo/multiplier system + score HUD
- [ ] Camera shake + hit-stop on death
- [ ] "KICKOFF BLAST" rebrand (theme)

### Day 2: Progression & Polish
- [ ] Team select (4-5 teams with kit colors)
- [ ] Pause menu + volume settings
- [ ] Rich game over screen with stats
- [ ] Local leaderboard (top 5)

### Day 3: Power-Ups & Depth
- [ ] 3 power-up types (Speed, Magnet, Shield)
- [ ] Style bonuses (Close Call, Limbo King)
- [ ] First-run tutorial overlay
- [ ] Dynamic difficulty phases

### Day 4: Visual & Audio Juice
- [ ] Particle effects (star burst, confetti, death smoke)
- [ ] Squash & stretch animations
- [ ] Crowd ambience + reactive music layers
- [ ] Dynamic commentary text
- [ ] Night Stadium (4th world)

### Day 5: Final Polish + Video
- [ ] Second chance revival mechanic
- [ ] Challenge system
- [ ] Star shop (cosmetics)
- [ ] Record pitch video (60-90 seconds)
- [ ] Final testing, bug fixing, balance

---

## 🎯 The "Champion Formula"

**What separates 1st place from 3rd place in game jams is NOT having more features — it's having a FEW features that are DEEPLY polished.**

The minimum viable champion path (if time is tight):

1. **Combo system** → Makes every run feel different and skill-rewarding
2. **Camera shake + particles** → Instantly feels 10× more professional
3. **Team select + KICKOFF branding** → Theme score jumps from 20 → 24
4. **Crowd ambience + commentary** → Audio score jumps from 12 → 14
5. **Rich game over + stats** → Design score jumps from 21 → 24
6. **Great pitch video** → Free 10% locked in

These 6 things alone take you from ~82 → ~96+. Everything else is bonus.

---

**⚠️ Don't try to implement everything.** Pick the features that give the highest score-per-hour. The priority list above is ordered by impact. If you only have 3 days, do Days 1-3 and skip the rest.

Good luck, champion! 🏆⚽

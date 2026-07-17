# Chapter Plan — Kickoff Rush "Life Journey"

This document captures the design plan for turning the 3 selectable worlds into a
**3-act "life journey"** of a footballer, reinforcing the KICKOFF theme
("the first step of every journey… and then you kick off again").

> Status: DESIGN ONLY. Not yet implemented. Repo freezes July 20, 2026.

---

## Theme connection

The organizers explicitly allowed a literal football game ("Or, of course, an actual
football game!") but also want creativity. Framing the 3 maps as **chapters of a
career** turns a literal sports game into a metaphor for a journey — the same
framing already used on the theme splash and the game-over screen.

> KICKOFF is the first step of every journey. Every player starts somewhere.
> The cards are the lessons. Your run ends not when you lose, but when you're
> sent off — and then you kick off again.

---

## The three chapters

| Chapter | World | Meaning | Difficulty |
|---------|-------|---------|------------|
| 1 | **World Cup stadium** | The Dream / The Prime — bright crowds, floodlights, he "made it" | Easy (baseline) |
| 2 | **Beach** | The Roots / Where It Started — humble beginning, barefoot on sand | Medium |
| 3 | **Indoor arena** | The Grind / The Hard Years — dark, enclosed, fighting to stay in | Hard (highest) |

Order recommendation: **Stadium → Beach → Indoor** (peak → roots flashback → grind),
or **Beach → Indoor → Stadium** (origin → struggle → triumph). Either reads as a journey.

---

## Core mechanic: the Chapter Gate (player choice)

Instead of auto-switching maps, the run **pauses at a gate** and lets the player choose:

- Trigger: player reaches a **distance milestone** (e.g. 600 m) **AND** scores a
  **Goal** in the Goal Chance penalty. The gate is *earned*, not random.
- Prompt shown (big, unmissable banner):
  > **CHAPTER 1 COMPLETE**
  > Press **SHIFT** to advance to Chapter 2: The Roots
  > *(or keep playing here for more score)*
- Player choices:
  - **Stay** → keep grinding current chapter for score (no penalty)
  - **SHIFT** → next map loads, difficulty ramps up
- Safety: if the player ignores the prompt, either auto-continue chapter 1 or
  auto-advance after a few seconds (decide during implementation).

### Why a choice gate (not forced / not ambient)
- **Player agency** — feels deliberate, not forced.
- **Theme fit** — "next step of the journey" becomes a conscious choice.
- **Score incentive** — staying = more points; advancing = harder + themed progression.
- **Low code** — one prompt + one key listener + one map swap at the gate.

---

## Death = restart the journey

On a RED CARD (game over), the journey restarts from **Chapter 1**.
This keeps the "kick off again" metaphor true: every run is a new beginning.

Optional: a "Career Complete" victory screen if the player clears Chapter 3
(or simply loop back into a harder Chapter 1).

---

## Difficulty curve per chapter

| Chapter | Speed scaling | Obstacle density | Card rarity (green) | Keeper/rival aggression |
|---------|---------------|-----------------|---------------------|--------------------------|
| 1 Stadium | baseline | normal | normal | normal |
| 2 Beach | +10–15% | higher | lower | cuts across lanes more |
| 3 Indoor | +20–25% | highest | lowest | fastest, widest |

Keep the curve gentle — the runner is normally endless; chapters add stage-based ramp,
not a difficulty cliff.

---

## Implementation checklist (rough)

- [ ] Define chapter order array (e.g. `['worldcup','beach','indoor']`).
- [ ] Track current chapter index; start at 0.
- [ ] Gate trigger: distance threshold + Goal scored → set `gateReady = true`.
- [ ] Show chapter-complete banner with SHIFT prompt when `gateReady`.
- [ ] SHIFT handler: advance chapter index, swap world (`currentWorld`), apply difficulty, hide banner.
- [ ] On death (`redCard` / game over): reset chapter index to 0.
- [ ] Per-chapter difficulty constants (speed mult, spawn gap, card weight).
- [ ] Between-chapter banner: "Chapter N: <name>" for ~2 s.
- [ ] Keep the choice non-blocking (timeout or "stay" option).

---

## Expected judging impact

| Criteria | Weight | Without feature | With feature (clean) |
|----------|--------|-----------------|----------------------|
| Theme (KICKOFF) | 25% | 23 | 24 |
| Gameplay | 25% | 23 | 23 |
| Design | 25% | 22 | 23 |
| Visual & Audio | 15% | 14 | 14 |
| Video (Pitch) | 10% | 10 | 10 |
| **Total** | **100%** | **92** | **94** |

The chapter system is a **safe, high-ROI addition**: it strengthens the two
weakest-scoring pillars (theme + design) for relatively little code. It is NOT a
#1 guarantee on its own — the **pitch video** remains the highest-leverage item
(the only score carried to the onsite round).

---

## Priority with ~1 day left (repo freeze July 20)

1. **Pitch video** (highest leverage — only score carried onsite)
2. **Chapter-gate feature** (theme + design boost, if time remains)
3. itch page theme text (already done)

Do not sacrifice the video for the feature. Video > feature for ranking.

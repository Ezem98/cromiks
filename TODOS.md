# 📋 TODOS

Deferred work captured during reviews. Each item has enough context to pick up cold.

---

## T-01 · Legendary still-image rights (pre-beta risk)

**What:** Decide and implement a rights-safe source for the *still image* on each legendary cromo.

**Why:** The catalog marks all 11 legendaries' photos as `type: video_capture` (frame-grabs of broadcaster footage). The PR8 beta plan dodges *clip* rights by embedding the official YouTube highlight ("Ver el momento"), but the still frame printed on the cromo itself is the same owned footage. This carries the same IP exposure as the Pokemon pack texture the product treats as a hard launch gate. Surfaced by the /plan-eng-review outside voice (2026-05-30).

**Pros:** Removes a launch-blocking IP risk hiding in plain sight; keeps the "zero third-party IP" product value honest.
**Cons:** Real content/legal work; may force a stylized/illustrated treatment instead of photoreal stills.

**Context:** Options to evaluate — licensed stills (Getty/AP), self-produced illustration of the moment, or a deliberately stylized non-photographic legendary treatment. The clip embed stays regardless. Affects the curated beta page since it must contain legendaries (see beta plan step 3).

**Depends on:** Which hero page is chosen for the beta (determines which legendaries' stills are needed first). croacia was floated (Gvardiol gambeta + Julián run).

---

## T-02 · Beta lifespan / page-2 expansion lever

**What:** Instrument curated-page completion time; keep page 2 ready to activate mid-beta.

**Why:** A ~15-20 card one-page pool with a 4-card daily pack completes in roughly 1-2 weeks, after which every pack is pure duplicates and the daily loop goes flat. For a soft beta meant to observe behavior over time, the experience could die before enough watching happens. Surfaced by the /plan-eng-review outside voice (2026-05-30).

**Pros:** Turns a structural limitation into a planned lever; `pages.is_active` makes expansion a one-line `UPDATE pages SET is_active=true`.
**Cons:** Requires a completion-time metric and a second page's content ready to go.

**Context:** Directly enabled by the `pages.is_active` mechanism chosen in the PR8 plan. Watch median time-to-complete the curated page across the cohort; if it's days, flip page 2 on. No code change needed to expand, only content + the flag flip.

**Depends on:** PR8 beta (`pages.is_active` + per-card weighted draw) shipped.

---

## T-03 · Full legendary treatment (post-beta depth upgrade)

**What:** Build out the complete DESIGN.md 12.5 legendary treatment per hero cromo, beyond the beta's reverent-minimal slice.

**Why:** The beta ships a deliberate subset (prism border + cinematic entrance + click-gated clip facade + `LegendaryBrief` text) to prove the "magic is real" in one month. DESIGN.md 12.5 specifies far more: holographic refraction, ambient particles, glow-rotation, unlimited mouse-tilt, unique ambient audio + comentarista relato, and bespoke-per-cromo design. That depth is what makes a legendary feel legendary on the 100th view. Surfaced by /plan-design-review (2026-05-30).

**Pros:** Delivers the full emotional ceiling of the product's signature feature; differentiator vs a static album.
**Cons:** Heavy (R3F/audio/per-cromo custom work); gated on content + rights (T-01); against the beta perf budget if done naively.

**Context:** Beta validates the wedge with motion+clip. This is the layered upgrade once the cohort confirms the magic lands and the still-image/audio rights (T-01) are resolved. Do it per-cromo, hero first. Keep the 13.4 perf budget (lazy-load all cinematic animation).

**Depends on:** T-01 (legendary rights) + beta learnings (did the magic land?).

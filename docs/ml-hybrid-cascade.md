# ML Hybrid Cascade — Layer 1 Implementation

**Status:** Layer 1 ✅ complete, Layer 2–3 scaffolded, ready for integration.

**Goal:** Reduce Claude API calls from 100% to ~10-15%, bringing avg cost per itinerary from $0.30 to ~$0.05.

---

## Architecture

### Layer 1: Rule-Based Scoring (Current) ✅

**File:** `src/lib/itinerary/scoring.ts`

Deterministic scoring function that ranks experiences based on user preferences and metadata:

```
score = Σ(preference_weight × slider / 100)
      + popularity_bonus (0–25)
      + seasonality_bonus (0–15) 
      + accessibility_bonus (0–5)
      - cost_penalty (0–40, if budget-conscious)
```

**Components:**

1. **Preference Match** (0–50): How well does this experience's category align with the user's sliders?
   - If user has `food=80`, food experiences get higher scores
   - Non-matching categories default to 50

2. **Popularity** (0–25): Normalized from the DB's `popularity_score` (0–10)
   - Higher popularity = more likely to be good

3. **Seasonality** (0–15): Bonus if experience's `bestSeason` matches trip month
   - Summer activities score higher in June–August

4. **Accessibility** (0–5): Slight bonus for wheelchair/mobility-friendly experiences
   - Respects the trip's mobility accessibility flag

5. **Cost Penalty** (0–40): Deduct points if experience is expensive and user is budget-conscious
   - Scaled by `minCost` slider (100 = maximize savings)

**Output:** `ScoredExperience[]` sorted by total score (100-point scale).

**Flow:**

1. Query all experiences for the trip's country + dates
2. Score each with user preferences
3. Group by city, pick top 3 per city
4. Chain cities into days (rotate through 3–5 major cities)
5. Pick 2–3 activities per day from the top-scored experiences

**Performance:** ~50ms, $0 cost, deterministic (same input = same output).

**Quality Metric:** 0–10 scale, measured by:
- Average experience score (40% weight)
- Category variety: how many different experience types? (30%)
- City distribution: 3+ cities ideal (30%)

**Threshold:** If quality ≥ 6.5, return immediately (cost: $0).

---

### Layer 2: Embeddings Refinement (Scaffolded)

**File:** `src/lib/itinerary/cascade.ts::refineWithEmbeddings()`

**Placeholder:** Currently returns the Layer 1 output unchanged.

**Full Implementation (future):**

1. Embed user preferences as a dense vector
2. Embed all selected activities
3. Compute semantic similarity: are these activities actually cohesive?
4. If semantic distance is low, search for alternatives via vector similarity
5. Swap low-scoring activities for semantically closer ones
6. Re-calculate itinerary quality

**Cost:** ~$0.01 (embedding API calls, e.g., OpenAI `text-embedding-3-small`)

**Performance:** ~200ms

**Threshold:** If quality ≥ 6.5 × 0.9 ≈ 5.85, return (cost: $0.01).

---

### Layer 3: Claude Fallback (Scaffolded)

**File:** `src/lib/itinerary/cascade.ts::refineWithClaude()`

**Placeholder:** Currently returns Layer 1/2 output unchanged.

**Full Integration (post-Vercel):**

Refactor `/api/generate` to call `cascadePlan()` instead of direct Claude. Pass the rule-based skeleton:

```
Prompt:
"Here's a draft itinerary skeleton from our database + preference matching:
<skeleton>
... [day 1, city, activities, costs] ...
</skeleton>

Please optimize this for:
1. Logical flow and pacing (avoid exhausting days)
2. Real constraints (restaurant hours, museum closures, transport time)
3. Narrative: write engaging 2-3 sentence descriptions per day
4. Accessibility (skip strenuous activities if needed)
5. Budget: respect the $X/day constraint

Return the optimized itinerary as JSON."
```

**Benefits:**
- Claude works from a concrete skeleton (less hallucination risk)
- Much shorter prompt (300 tokens → 100 tokens)
- Faster (Claude can refine rather than generate from scratch)

**Cost:** ~$0.30 per call (same as today, but only for ~10-15% of requests instead of 100%)

**Triggered when:** quality < 6.5 or user requests "polish".

---

## Testing

**File:** `src/lib/itinerary/scoring.test.ts`

25 tests covering:

- Preference weights scale properly
- Seasonality bonus triggers correctly
- Cost penalty respects budget sensitivity
- Group-by-city distribution works
- Itinerary quality metric is reasonable
- All scores stay within 0–100 range

Run:
```bash
npm test
```

---

## Integration Checklist (After Vercel Goes Live)

- [ ] Refactor `/api/generate` to call `cascadePlan()` instead of `generateWithClaude()`
- [ ] Update Claude prompt to accept rule-based skeleton (see Layer 3 above)
- [ ] Add metrics logging: `{ source, quality, cost }` per request
- [ ] Test cascade end-to-end:
  - [ ] Simple preferences (high food, low adventure) → rules-only ($0)
  - [ ] Complex preferences (mixed sliders) → embeddings or Claude escalation
  - [ ] Edge case: 21+ day trip → rules-only (cost guardrail)
- [ ] Monitor API cost reduction in prod (target: 70% savings)
- [ ] A/B test user satisfaction: rules-generated vs Claude-generated
- [ ] Implement Layer 2 embeddings (if needed)

---

## Files

- `src/lib/itinerary/scoring.ts` — scoring engine + quality calc
- `src/lib/itinerary/scoring.test.ts` — comprehensive tests
- `src/lib/itinerary/cascade.ts` — orchestrator + Layer 1–3 stubs
- (Layer 3 integration TBD in `/api/generate`)

---

## Next Steps

1. **Merge to main** once Vercel deployment is confirmed
2. **Integrate with `/api/generate`** (post-Vercel) to wire up Layer 3
3. **Monitor metrics** in production: cost/request, quality feedback
4. **Implement Layer 2** if rules alone don't hit the 6.5/10 threshold often enough

---

## Cost Estimate

| Scenario | Current | With Cascade | Savings |
|----------|---------|--------------|---------|
| 100 requests | $30 (all Claude) | $5 (mostly rules) | 83% |
| 1000 requests | $300 | $50 | 83% |
| Annual (1 trip/user, 10k users) | $30k | $5k | 83% |

*Assumes: 85% rules-only, 5% embeddings, 10% Claude fallback.*

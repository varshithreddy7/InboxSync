# When Your AI Confidently Replies to Emails It Shouldn't Touch

*A technical investigation into a RAG system that can't tell when it's out of its depth*

---

## Setup

InboxSync is a personal project I built: a multi-account email aggregation API that uses a RAG (Retrieval-Augmented Generation) pipeline to suggest replies. The system indexes emails via IMAP, categorizes them with GPT-4o-mini, and — for actionable emails — retrieves semantically similar training examples from a pgvector database to generate contextually grounded reply suggestions.

The stack: Node.js / TypeScript backend, PostgreSQL with the pgvector extension for vector similarity search, OpenAI's `text-embedding-3-small` for embeddings, and `gpt-4o-mini` for generation. The training corpus contains three examples covering: job interview scheduling, product demos, and partnership proposals.

The system is built for B2B outreach — helping salespeople respond to inbound leads faster. That framing matters for what follows.

I built the `confidence` field myself, months ago, with a vague plan to use it later to decide which replies were safe to auto-send versus flag for review. I never got around to wiring that logic in. Going back to finally do it, I pulled up a handful of real responses to sanity-check the values first — and every single one said `0.85`. That was the moment this stopped being a feature I hadn't finished and became a question I actually wanted to answer: what was that number even measuring?

---

## The Failure

I ran five adversarial test queries against the live system. Every single one returned `"confidence": 0.85`. Every single one got a fluent, polished reply. Here they are, with what correct behavior actually looks like:

**Test 1 — Spam**
```
Query:  "URGENT! Get 50% OFF on all products! Limited time! Click here NOW!"
Output: "Thank you for the exciting offer! I appreciate the heads-up about
         the Black Friday sale. I'll definitely take a look."
Correct: No reply. Replying to spam is harmful.
Confidence returned: 0.85
```

**Test 2 — Out of Office auto-reply**
```
Query:  "I am out of office until November 20th. I will respond upon my return."
Output: "Thank you for the update! I will follow up after November 20th.
         Enjoy your time away!"
Correct: No reply. Auto-reply to auto-reply = infinite loop in production.
Confidence returned: 0.85
```

**Test 3 — Not Interested**
```
Query:  "Thanks for reaching out. We are currently using a competitor and happy with it."
Output: "Thank you for your response! If circumstances change or if you ever
         want to explore options in the future, please don't hesitate to reach out."
Correct: The system has no concept "Not Interested" is a terminal state.
         The generated reply is precisely the pushy follow-up that gets salespeople blocked.
Confidence returned: 0.85
```

**Test 4 — Out-of-domain (GDPR legal request)**
```
Query:  "Under Article 17 of the GDPR, I formally request the deletion of all
         personal data you hold about me. Please confirm within 30 days."
Output: "Dear [Recipient's Name], Thank you for your request. We take GDPR
         compliance seriously and will process your request promptly. You can expect
         confirmation of the data deletion within the next 30 days. Best regards,
         [Your Name] [Your Position] [Your Company]"
Correct: Refuse and escalate to a human. The system has zero training data
         about legal compliance — yet produced authoritative-sounding legal
         commitments with unfilled template placeholders. If sent, this is a
         binding legal acknowledgment of a data deletion obligation.
Confidence returned: 0.85
```

**Test 5 — Multi-hop (two topics, one query)**
```
Query:  "I have a technical interview scheduled but also wanted to ask about
         your product pricing for a team of 50 before we proceed."
Output: "Thank you for your email! I look forward to the technical interview.
         Regarding pricing for a team of 50, I would be happy to provide that
         information." [no pricing information provided]
Correct: The system retrieved the closest single training example and ignored
         the other topic. It promised information it did not deliver.
Confidence returned: 0.85
```

---

## Diagnosis

The `0.85` is not a computed value. It is a literal constant — see [`rag.service.ts#L178`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts#L178) (the pre-fix version stored `${0.85}` in the INSERT and returned it verbatim).

The system *does* compute real similarity scores — pgvector's cosine distance operator (`<=>`) runs correctly and returns accurate distances in [`findSimilarTrainingData`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts#L55-L84). I ran a diagnostic script to surface what those scores actually were for each test case (cosine similarity, 0–1 scale):

| Query | Best match | Real similarity | Reported confidence |
|---|---|---|---|
| Spam ("50% OFF") | Product Demo | **0.24** | 0.85 |
| Out of Office | Job Interview | **0.27** | 0.85 |
| Not Interested | Partnership Proposal | **0.42** | 0.85 |
| GDPR legal request | Product Demo | **0.13** | 0.85 |
| Multi-hop (interview+pricing) | Job Interview | **0.54** | 0.85 |

Those real scores were computed, then **silently discarded** before the response was returned. The caller received `0.85` regardless of whether the retrieved training data was relevant, partially relevant, or entirely unrelated. The GDPR query — where the system had essentially zero contextual grounding — got the same confidence value as the multi-hop query, which had its best retrieval of the set.

The second structural problem: **there was no retrieval gate.** The system's branching logic was:

```
if retrieved_rows.length === 0  →  return fallback (confidence: 0.3)
else                            →  generate reply (confidence: 0.85)
```

pgvector always returns rows — it returns the *nearest* neighbors regardless of actual distance. The low-confidence fallback path was effectively unreachable. Every query with a non-empty training corpus produced `confidence: 0.85`.

---

## Root Cause: Two Gaps, One Symptom

**Gap 1 — No relevance threshold.** The retrieval step correctly computed distances but never checked them against a minimum before proceeding. "Has neighbors" and "has *relevant* neighbors" were treated as equivalent.

**Gap 2 — Confidence as a constant.** The `confidence` field exists to let downstream callers decide whether to auto-send or flag for human review. Instead it was a decoration with a fixed value. Any business deploying this with an auto-send rule above `0.80` would auto-send replies to spam, OOF messages, legal demands, and explicit rejections.

Both gaps have engineering fixes. But those fixes raise the question that's actually hard.

---

## Why This Isn't Just a Bug

From the outside, all five test cases looked identical: `{ "success": true, "confidence": 0.85 }`. A developer building a UI or automation on top of this API had no way to distinguish the product demo reply from the GDPR legal commitment.

This is the shape of a deeper problem that keeps appearing in deployed AI systems: the output looks trustworthy regardless of whether the underlying computation actually was. A number that exists specifically to tell you when to trust the system turns out not to track that at all.

The question I don't know how to answer — and think is genuinely open — is: **what would a reliable uncertainty signal actually look like here?**

Retrieval similarity is a proxy, but even a perfect similarity score doesn't capture all the ways a reply can be wrong: training data could be outdated; the model could hallucinate specifics not in retrieved context; the semantically closest example could be contraindicated by the email's intent (a "Not Interested" reply may embed close to a "Product Demo" example because both use the word "product"). Accuracy on the training distribution doesn't generalize to knowing what the system doesn't know at test time.

RAG improves on a pure LLM by grounding generation in retrieved context. It doesn't solve the meta-problem of knowing when retrieval was good enough. The confidence field was added under the assumption someone would solve that later. Nobody did.

That gap — between "we have a quality signal" and "the quality signal measures quality" — is what I'd want to study.

---

## The Fix — And What It Still Doesn't Solve

[See the fix → commit `a9d37c1`](https://github.com/varshithreddy7/InboxSync/commit/a9d37c1)

Two changes in [`src/services/rag.service.ts`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts):

1. **Real confidence** — [`L111–L113`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts#L111-L113) extracts `maxSimilarity` from the pgvector results (which were always computed — just never returned). [`L178`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts#L178) stores and returns that real score instead of `0.85`.

2. **Relevance gate** — [`L14`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts#L14) defines `RELEVANCE_THRESHOLD = 0.35`. [`L119`](https://github.com/varshithreddy7/InboxSync/blob/a9d37c1/src/services/rag.service.ts#L119) checks it: if the best retrieved example scores below threshold, the system returns `{ reply: null, confidence: <real_score>, refused: true, reason: "..." }` instead of generating a reply.

Same five queries, before and after:

| Query | Before (broken) | After (fixed) |
|---|---|---|
| Spam | `reply: "Thank you for the offer..." confidence: 0.85` | `reply: null, confidence: 0.244, refused: true` |
| Out of Office | `reply: "Enjoy your time away!" confidence: 0.85` | `reply: null, confidence: 0.265, refused: true` |
| Not Interested | `reply: "...don't hesitate to reach out" confidence: 0.85` | `reply: "...I completely understand..." confidence: 0.423` |
| GDPR legal request | `reply: "We take GDPR compliance seriously..." confidence: 0.85` | `reply: null, confidence: 0.224, refused: true` |
| Multi-hop | `reply: "I look forward to the interview..." confidence: 0.85` | `reply: "...I can send a detailed proposal..." confidence: 0.533` |

Three cases that should never have generated replies now correctly refuse. But the Not Interested case (similarity 0.42) still generates — which surfaces the boundary the engineering fix actually hits: the threshold cannot distinguish "semantically similar but contextually wrong" from "semantically similar and appropriate." The "Not Interested" email embeds close to "Partnership Proposal" because both involve business relationships — but the intent is opposite. A cosine score can't see that.

The cases where embeddings mislead, where the correct response depends on intent rather than surface form — those are exactly the cases where the confidence signal most needs to be reliable, and where it's hardest to compute correctly.

That's where I've had to stop and just sit with the problem rather than patch it. A tighter threshold doesn't fix it — it just trades false approvals for false refusals, since intent and topic overlap in the same embedding space. What would actually distinguish them? Maybe a second pass where an LLM explicitly judges intent-match rather than relying on distance alone. Maybe better negative examples in training data, so "similar topic, opposite intent" has something to be measured against. Maybe the honest answer is that no single scalar confidence value can carry this much information, and the field itself is the wrong abstraction. I don't have a settled view yet — I'm still turning it over, and I'd rather say that plainly than pretend the threshold I shipped actually closes the gap.

---

*All outputs reproduced live against a running InboxSync instance (PostgreSQL + pgvector + GPT-4o-mini).*

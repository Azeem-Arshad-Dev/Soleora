# Soleora article writing brief

Write original, accurate, friendly-but-knowledgeable magazine articles about a shoe style.
Audience: curious general readers in their 20s-40s. British-neutral spelling is fine but be consistent (use US spelling).

## Output per article (two files)

1. `content/articles/<slug>.md`, body only (NO H1, no front matter), 650-850 words total, structure EXACTLY:

   - 2-3 intro sentences (one short paragraph).
   - `## A brief history`
   - `## Key features` - an ordered list of 4-6 items. Items 1..N MUST begin with the given hotspot labels, in the given order, formatted `1. **<Label>.** explanation...`. Remaining items are your own, same format.
   - `## Materials`
   - `## When and how to wear it`
   - `## Finding the right fit`
   - `## Care and maintenance`

   Short paragraphs (2-4 sentences). Plain markdown only (paragraphs, ordered/bulleted lists, **bold**). No links, no images, no tables, no emoji.

2. `content/meta/<slug>.json`:
```json
{
  "title": "Chelsea Boots: A Wardrobe Essential",
  "standfirst": "One sentence, max 20 words, sentence case.",
  "excerpt": "Max 110 characters, for cards.",
  "tags": ["three", "lowercase", "tags"],
  "formality": 3,
  "facts": { "origin": "e.g. Victorian England, 1840s", "bestFor": "max 6 words", "materials": "max 6 words" }
}
```
Use the title given to you exactly.

## Rules
- No prices, no shopping links, no brand recommendations or brand names (describe history without naming companies or trademarked models).
- No claims you can't back up; hedge dates with "around"/"by the" when uncertain.
- No ALL-CAPS, no emoji, no exclamation marks.
- Check word count with `wc -w` (target 650-850; hard limits 600-900).
- formality: 1 = very casual ... 5 = black tie.

# Campaign Engine: submission details

**Track:** fal
**One line:** From a business objective and one product photo to a consistent, campaign-ready creative package, with a brand guardian that checks and self-corrects every asset against brand, legal and channel rules.

## The problem

Generative models can make a campaign in minutes, but brands can't ship it. The product drifts between images (wrong cap, misspelled logo), copy slips into health claims or clichés, and prompts borrow other people's IP. Today a human catches all of this by hand, asset by asset, which removes most of the speed advantage.

## What it does

1. **Brief:** brand, market, objective, audience, brand colors and one product photo.
2. **Strategy (creative director agent):** audience insight, key message and 3 distinct concepts, plus a written product identity and the 5–8 elements that must never change.
3. **Plan (art director agent):** production prompts for every format, plus English and Greek copy written natively for the market.
4. **Pre-flight (compliance reviewer):** checks the plan against the enabled rules before any pixel is generated, rewrites only the violating text (up to 2 rounds), then appends product-consistency instructions in code so no model can drop them. Shown on the board as before/after.
5. **Production on fal:** the hero (4:5) first, then the 9:16 and 16:9 versions in parallel using the hero as a style reference, then a video from the 9:16 frame.
6. **Asset QA with self-correction:** every image is compared with the original product photo and checked against the rules. On failure a repair agent rewrites the prompt to fix the exact problem and the image is regenerated, up to 3 attempts. After that the asset is flagged for human review.
7. **Audit trail:** a JSON export with every rule result, every attempt and prompt, and an AI-generated disclosure.

**Separation of duties:** the creative agents never see the rules. Like an agency, creatives create and an independent reviewer enforces.

## Brand guardian rules

| Group | Rule | Checked at |
|---|---|---|
| Brand | Product identity: shape, cap, logo, large text, colors | Every image |
| Brand | Specific, not generic: no advertising clichés | Plan |
| Legal | No third-party IP, plus a user-supplied protected-names list | Plan and every image |
| Legal | No violence or crime | Plan and every image |
| Legal | No functional or health claims | Plan |
| Channel | Headline and caption length, hashtag count | Plan (counted in code, not judged by a model) |

Each rule can be switched on or off per campaign.

## How fal is used

- `blackforestlabs/flux-3/edit-image`: product-preserving image editing for the hero, 9:16 and 16:9, and for every self-correction regeneration. Each takes the product photo, and the hero where relevant, as reference images.
- `blackforestlabs/flux-3-max/image-to-video`: the motion spot, made from the approved 9:16 frame.
- fal storage for the product photo upload.

OpenAI (`gpt-4.1`, set by `OPENAI_MODEL`) runs the strategy, plan, compliance review, vision QA and prompt-repair agents.

## Demo scenario

The "Game launch week" brief deliberately pushes a product toward a tie-in with a huge video game release. The guardian is given the game's names as protected names, removes the IP and crime references from the plan in pre-flight, and keeps checking the generated images for them.

## Tech

Next.js 15 (App Router), React 19, `@fal-ai/client`, `openai`. No database: state lives in the browser session and exports as JSON.

```
app/page.js            UI and orchestration (generate → check → repair → retry)
app/api/strategy       creative director agent
app/api/plan           art director agent
app/api/preflight      compliance review and revision loop on the plan
app/api/image          fal image edit
app/api/check          vision QA of an asset against the rules
app/api/fix            prompt repair agent
app/api/video          fal image-to-video
app/api/upload         fal storage upload
lib/rules.js           rule book, deterministic channel check, consistency guards
```

## Run it

```bash
npm install
cp .env.local.example .env.local   # add FAL_KEY and OPENAI_API_KEY
npm run dev                        # http://localhost:3000
```

## What's next

- Brand rule books loaded from a brand's guidelines PDF instead of a fixed list.
- More channels and languages, with per-channel safe zones checked on the image.
- A reviewer inbox for assets flagged for human review.

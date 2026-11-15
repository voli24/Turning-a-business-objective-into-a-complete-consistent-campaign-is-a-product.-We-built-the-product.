# Campaign Engine

From a business objective and one product photo to a consistent, campaign-ready creative package,
with a brand guardian that checks and self-corrects everything against brand, legal and channel rules.

## Run it

1. In a terminal inside this folder: npm install
2. Copy `.env.local.example` to `.env.local` and paste your NEW (rotated) keys.
3. npm run dev, then open http://localhost:3000

## Flow

1. Brief: pick a demo brief ("Afternoon launch" or "Game launch week") and upload the product photo.
2. Brand guardian: switch rules on or off, list protected names (other brands, games, films).
3. Strategy (creative director agent): insight, key message, 3 concepts.
4. Plan (art director agent): prompts plus English and Greek copy.
5. Pre-flight (compliance reviewer): checks the plan against the rules, rewrites violations (max 2 rounds),
   then adds the product-consistency instructions in code. Shown on the board as before/after.
6. Production on fal: hero, then 9:16 and 16:9 in parallel, then the video from the 9:16 image.
7. Asset QA: each image is checked against the asset rules. On failure the repair agent rewrites the prompt
   and the image is regenerated, up to 3 attempts, then it is flagged for human review.
8. Export audit trail: JSON with every rule result, every attempt and an AI-generated disclosure.

Creative agents never see the rules: like an agency, creatives create and a separate reviewer enforces.

## If something fails

- The error text from fal or OpenAI shows in the app and in the terminal.
- Model not found: set OPENAI_MODEL in .env.local to a model your OpenAI account has.

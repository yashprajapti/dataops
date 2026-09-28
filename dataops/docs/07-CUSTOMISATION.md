# 07 · Customisation

| What | Where |
|---|---|
| Product name, owner, email, social links, nav items | `lib/site.ts` |
| Colours (lime / cyan / violet…) | `tailwind.config.ts` → `theme.extend.colors` |
| Chart colours | `lib/palette.ts` (validated for colour-blind safety — re-validate if you change them) |
| Global styles, buttons, cards | `app/globals.css` (`.btn-primary`, `.card`, `.glass`, …) |
| Hero text & animated demo scenes | `components/landing/Hero.tsx`, `HeroPreview.tsx` (`SCENES`) |
| Features, agents demo lines, use cases, stats | `components/landing/Sections.tsx` |
| Testimonials | `components/landing/Testimonials.tsx` (`T` array) |
| Pricing plans & comparison table | `components/landing/Pricing.tsx` |
| FAQ | `components/landing/Footer.tsx` (`FAQS`) |
| Agents (names, prompts, suggestions) | `lib/agents.ts` |
| Blog posts & docs content | `lib/content.ts` |
| Sample datasets | `lib/sample-data.ts` — add a builder and register it in `SAMPLE_DATASETS` |
| Logo | `components/Logo.tsx` and `public/icon.svg` |

## Add a new agent
1. Add an entry to `AGENTS` in `lib/agents.ts` (id, colour, icon, system prompt, suggestions).
2. Add its id to the `AgentId` union.
3. Add a case in `localAgentReply()` (`lib/local-engine.ts`) for the offline answer.
The chat UI, sidebar and landing page pick it up automatically.

## Production auth (Supabase example)
1. `npm i @supabase/supabase-js` and create a Supabase project.
2. Replace `register`, `authenticate`, `socialSignIn` in `lib/auth.ts` with `supabase.auth.signUp`, `signInWithPassword`, `signInWithOAuth`.
3. Keep calling `login(email, name)` from the store after success — the rest of the app is unchanged.

## Real payments
Replace `choose()` in `app/dashboard/billing/page.tsx` with a Razorpay / Stripe Checkout session created in a new API route, and update the plan from a webhook.

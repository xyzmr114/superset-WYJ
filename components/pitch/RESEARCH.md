> **Current pivot · 22 October 2026:** Read [PIVOT.md](../../PIVOT.md) and the [four-person handoff](../../WOULD_YOU_JUMP_HANDOFF.md). Private founder matchmaking is the current product. Older module notes below are implementation references; the current pivot and ownership take precedence.

# Founder preparation framework — source notes

Reviewed 2026-10-22. This is a public-source synthesis, not inside knowledge, an official application, or a scoring system. Other investor brands are intentionally absent from the product UI. General guidance is not attributed to super{set}.

## Public super{set} mechanisms

- [Solution memo and message testing](https://superset.com/blogs/vcs-write-investment-memos): organize the thesis around customer pain, team suitability, timing, competition, and data/technical differentiation. Their message-testing discussion explicitly depends on studio experience; it should not be presented as proof of product-market fit.
- [Company-building approach](https://superset.com/approach): begin with a focused initial product, consider expansion in stages, and make data central to the solution. Their stated focus includes B2B enterprise. This does not establish the hackathon judging rubric.

## General startup synthesis

- [Customer conversations and early products](https://www.ycombinator.com/library/dS-how-to-start-a-startup-building-product-talking-to-users-and-growing): understand a specific problem through users and build a small usable response.
- [Market fit and evidence](https://a16z.com/12-things-about-product-market-fit/): test a value hypothesis and distinguish meaningful demand from impressive-looking metrics.
- [User fit versus market fit](https://a16z.com/product-user-fit-comes-before-product-market-fit/): a small enthusiastic group does not establish a broad paying market.
- [The Mom Test — author site](https://www.momtestbook.com/): practical customer discovery, avoiding biased feedback, and assessing buying intent. The UI's questions are our paraphrased exercises, not excerpts from the book.
- [The Lean Startup — methodology](https://theleanstartup.com/principles): experiments, feedback, actionable measures, and validated learning. Our short experiment prompts are adaptations, not official templates.

## Implementation decisions

Use self-reported labels: unknown, hypothesis, observed. No fundability percentage or automated claim that evidence has been verified. Blank answers stay blank. The founder must explicitly copy review notes into the editor; existing save/version/approval controls then apply. Nothing is auto-submitted.

The nine questions and the evidence labels are our product design, not a published nine-part super{set} framework. Book-derived and general investor lessons appear under “General startup practice.” No other investor branding appears in UI or exported notes.

## Content-generation handoff

Vernika can import `reviewPrompts` from `components/pitch/framework.ts` as research context or move the pure data into a shared location by agreement. Do not change matching contracts. Generation should identify missing evidence and ask the next useful question rather than fabricate a persuasive answer. Public project activity alone cannot establish paying demand. Keep private personal constraints out of model inputs and generated pitch text.

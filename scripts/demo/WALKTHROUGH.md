# Visible product walkthrough

Keep WYJ running on port 3002 and the counterpart responder running:

```sh
BASE_URL=http://localhost:3002 pnpm exec tsx scripts/demo/adjacent.ts
```

In another shell:

```sh
pnpm demo:walkthrough
```

A separate Chromium window types the Protein Pilot idea, publishes its approved brief, requests an introduction, agrees a working trial, exports the mutually approved joint pitch, and uses DeepSeek with explicit brief-only consent. The script operates the real UI and server. Counterpart accounts come from the responder's sample profiles. Your existing browser session stays separate.

Recordings, screenshots and the exported pitch are saved to `.wyj-demo/recordings/`. Override with `WALKTHROUGH_OUTPUT=/absolute/path`. Set `BASE_URL` for a different port. Add `--skip-premium` to record just the introduction, trial and joint pitch.

If Chromium is missing, run `pnpm exec playwright install chromium` once. The app and responder must remain running. A failed step saves a screenshot and exits with an error rather than claiming success.

To repeat continuously, run `pnpm demo:loop`. Each cycle opens a fresh browser session and retains the latest three recordings. Ctrl+C stops the loop.

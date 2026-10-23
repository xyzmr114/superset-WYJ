import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

// Uses the actual UI and an isolated session. Run adjacent.ts for the counterpart.
const base = process.env.BASE_URL || 'http://localhost:3002';
const out = path.resolve(process.env.WALKTHROUGH_OUTPUT || '.wyj-demo/recordings');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: false, slowMo: 180 });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: out, size: { width: 1440, height: 1000 } }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(90000);
const pause = () => page.waitForTimeout(900);
async function click(locator) { console.log('Click:', String(locator)); await locator.scrollIntoViewIfNeeded(); await pause(); await locator.click(); }
async function type(locator, text) { await locator.scrollIntoViewIfNeeded(); await locator.fill(''); await locator.pressSequentially(text, { delay: 32 }); await pause(); }
async function enabled(locator) { await locator.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Copy draft' && !b.disabled), { timeout: 90000 }); }
try {
  console.log('Opening WYJ. Recording the real app flow.');
  await page.goto(`${base}/agent?new=1`);
  await type(page.locator('#idea-field'), 'AI-personalized high-protein meal delivery for busy gym-goers. Build weekly menus around protein goals, dietary needs and budget, then coordinate prep and delivery with local kitchens.');
  await click(page.getByRole('button', { name: 'Engineering', exact: true }));
  const niche = page.getByRole('textbox', { name: /Add custom: What.*niche/ });
  await type(niche, 'Protein meal delivery'); await niche.press('Enter');
  await click(page.getByRole('button', { name: 'Choose my partner →', exact: true }));
  const needs = page.getByRole('textbox', { name: /Add custom: I.*looking/ });
  await type(needs, 'Food operations'); await needs.press('Enter');
  await click(page.getByRole('button', { name: 'Preview my profile →', exact: true }));
  await type(page.locator('#alias-field'), 'Protein Pilot');
  await page.locator('#consent-field').check();
  await click(page.getByRole('button', { name: 'Publish & find founders →', exact: true }));
  await page.waitForURL(/\/matches/);
  await click(page.getByRole('button', { name: 'Interested · connect →', exact: true }).first());
  const card = page.locator('article').filter({ has: page.locator('ol[aria-label="Introduction consent status"]') }).first();
  await type(card.getByLabel('Name to reveal'), 'Alex Parker');
  await type(card.getByLabel('Contact to reveal'), 'alex@example.com');
  await card.getByRole('checkbox', { name: /I approve revealing/ }).check();
  await click(card.getByRole('button', { name: 'Approve these details for this intro', exact: true }));
  await card.getByText('You both said yes', { exact: true }).waitFor();
  console.log('Mutual introduction completed.');
  await pause();
  await click(card.getByText('Plan your first project together →', { exact: true }));
  await click(card.getByRole('button', { name: 'Propose a 48-hour working trial →', exact: true }));
  await type(card.getByLabel('Shared goal', { exact: true }), 'Test an AI-personalized high-protein meal delivery service.');
  await type(card.getByLabel('Concrete deliverable', { exact: true }), 'One seven-day menu prototype and feedback from three gym-goers.');
  await type(card.getByLabel('My contribution', { exact: true }), 'Build the AI menu and ordering prototype.');
  await type(card.getByLabel('Their proposed contribution', { exact: true }), 'Validate kitchen prep, ingredient costs and delivery operations.');
  await card.getByRole('checkbox', { name: /Share this exact proposal/ }).check();
  await click(card.getByRole('button', { name: 'Share trial proposal', exact: true }));
  await card.getByRole('checkbox', { name: /I approve this exact trial/ }).check();
  await click(card.getByRole('button', { name: 'Approve this trial', exact: true }));
  await card.getByText(/Both approved.*ready to build/).waitFor();
  console.log('Both approved the working trial.');
  await pause();
  await click(card.getByRole('link', { name: 'Build a joint pitch →', exact: true }));
  await click(page.getByRole('button', { name: 'Create draft for this match', exact: true }));
  await page.getByRole('checkbox', { name: /I reviewed saved version/ }).check();
  await click(page.getByRole('button', { name: 'Approve this version', exact: true }));
  await enabled(page.getByRole('button', { name: 'Copy draft', exact: true }));
  const downloaded = page.waitForEvent('download');
  await click(page.getByRole('button', { name: 'Download .md', exact: true }));
  await (await downloaded).saveAs(path.join(out, 'Protein-Pilot-joint-pitch.md'));
  console.log('Joint pitch approved and downloaded.');
  if (!process.argv.includes('--skip-premium')) {
    await page.goto(`${base}/plans`);
    await click(page.getByRole('button', { name: 'Try Premium →', exact: true }));
    await page.getByRole('button', { name: 'Premium active', exact: true }).waitFor();
    await page.goto(`${base}/premium`);
    await page.getByRole('checkbox', { name: /Send exactly this approved brief to DeepSeek/ }).check();
    await click(page.getByRole('button', { name: 'Enhance with DeepSeek', exact: true }));
    await page.getByText(/Generated by DeepSeek/).waitFor({ timeout: 120000 });
    console.log('DeepSeek enhanced the approved brief.');
  }
  await pause();
  await page.screenshot({ path: path.join(out, 'walkthrough-complete.png'), fullPage: true });
  console.log('Walkthrough complete.');
} catch (error) {
  await page.screenshot({ path: path.join(out, 'walkthrough-error.png'), fullPage: true }).catch(() => {});
  console.error(error.message); process.exitCode = 1;
} finally {
  const video = page.video();
  await context.close(); await browser.close();
  if (video) { await video.saveAs(path.join(out, 'WYJ-Protein-Pilot.webm')); console.log(`Recording: ${path.join(out, 'WYJ-Protein-Pilot.webm')}`); }
}

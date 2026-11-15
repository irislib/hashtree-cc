import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

const carousel = (page: Page) => page.getByRole('region', { name: 'Use case carousel' });
const viewport = (page: Page) => carousel(page).getByRole('group', { name: 'Use case slides' });
const titles = ['Iris Files', 'Iris Audio', 'Iris Docs', 'Iris Video', 'Iris Chat', 'Decentralized Git'];
const selected = (page: Page, number: number) =>
  expect(carousel(page).getByText(titles[number - 1], { exact: true })).toBeVisible();

test.beforeEach(async ({ page }) => {
  await page.goto('/#/dev');
  await viewport(page).scrollIntoViewIfNeeded();
  await carousel(page).focus();
});

type Point = { dx: number; dy?: number };

async function touch(page: Page) {
  const box = await viewport(page).boundingBox();
  if (!box) throw new Error('Carousel viewport is missing');
  const session = await page.context().newCDPSession(page);
  const start = Date.now() / 1000;
  return {
    width: box.width,
    async send(type: 'touchStart' | 'touchMove' | 'touchCancel' | 'touchEnd', ms: number, ...points: Point[]) {
      await session.send('Input.dispatchTouchEvent', {
        type, timestamp: start + ms / 1000,
        touchPoints: points.map(({ dx, dy = 0 }, index) => ({
          x: box.x + box.width * 0.75 + dx, y: box.y + box.height * 0.25 + dy,
          id: index + 1, radiusX: 2, radiusY: 2,
        })),
      });
    },
    close: () => session.detach(),
  };
}

test('a 22px quick touch flick advances but a tap or paused flick stays put', async ({ page }) => {
  const t = await touch(page);
  await t.send('touchStart', 0, { dx: 0 });
  await t.send('touchEnd', 8);
  await selected(page, 1);
  await t.send('touchStart', 30, { dx: 0 });
  await t.send('touchMove', 46, { dx: -22 });
  await t.send('touchEnd', 240);
  await selected(page, 1);
  await t.send('touchStart', 300, { dx: 0 });
  await t.send('touchMove', 316, { dx: -20 });
  await t.send('touchEnd', 325);
  await selected(page, 1);
  await t.send('touchStart', 400, { dx: 0 });
  await t.send('touchMove', 500, { dx: -28 });
  await t.send('touchEnd', 505);
  await selected(page, 1);
  await t.send('touchStart', 600, { dx: 0 });
  await t.send('touchMove', 670, { dx: -22 });
  await t.send('touchEnd', 675);
  await selected(page, 2);
  await t.close();
});

test('slow dragging changes slide only past half the visible width', async ({ page }) => {
  const t = await touch(page);
  await t.send('touchStart', 0, { dx: 0 });
  await t.send('touchMove', 1200, { dx: -t.width * 0.45 });
  await t.send('touchEnd', 1210);
  await selected(page, 1);
  await t.send('touchStart', 1400, { dx: 0 });
  await t.send('touchMove', 3100, { dx: -t.width * 0.55 });
  await t.send('touchEnd', 3110);
  await selected(page, 2);
  await t.close();
});

test('a fast reversal follows its release direction across the first slide', async ({ page }) => {
  const t = await touch(page);
  await t.send('touchStart', 0, { dx: 0 });
  await t.send('touchMove', 800, { dx: -95 });
  await t.send('touchMove', 817, { dx: -45 });
  await t.send('touchEnd', 821);
  await selected(page, 6);
  await t.close();
});

test('vertical, canceled and two-finger gestures leave the same slide selected', async ({ page }) => {
  const t = await touch(page);
  await t.send('touchStart', 0, { dx: 0 });
  await t.send('touchMove', 20, { dx: -65 });
  await t.send('touchCancel', 25);
  await selected(page, 1);
  await t.send('touchStart', 100, { dx: 0 });
  await t.send('touchMove', 118, { dx: -60 });
  await t.send('touchStart', 125, { dx: -60 }, { dx: -100 });
  await t.send('touchEnd', 136);
  await selected(page, 1);
  await t.send('touchStart', 200, { dx: 0 });
  await t.send('touchMove', 220, { dx: -6, dy: 50 });
  await t.send('touchMove', 240, { dx: -100, dy: 65 });
  await t.send('touchEnd', 249);
  await selected(page, 1);
  await t.close();
});

test('both wrap directions animate exactly one slide and settle on the equivalent copy', async ({ page }) => {
  const track = viewport(page).locator(':scope > div');
  await expect(track).toHaveCSS('transition-duration', '0.3s');
  await expect(track).toHaveCSS('transition-timing-function', 'ease-out');
  for (const [control, target, direction] of [['Previous', 6, 1], ['Next', 1, -1]] as const) {
    const movement = await carousel(page).evaluate((element, label) => {
      const track = element.querySelector<HTMLElement>('[aria-label="Use case slides"] > div')!;
      return new Promise<number>((resolve) => {
        track.addEventListener('transitionrun', () => {
          const slide = track.getBoundingClientRect().width;
          const animation = track.getAnimations()[0];
          const x = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
          animation.pause();
          animation.currentTime = 0;
          const start = x();
          animation.currentTime = 299.99;
          resolve((x() - start) / slide);
          animation.finish();
        }, { once: true });
        element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
      });
    }, control);
    expect(movement).toBeCloseTo(direction);
    await selected(page, target);
    await expect.poll(() => track.evaluate((el) =>
      new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 / el.getBoundingClientRect().width,
    )).toBe(-target);
  }
});

test('reduced motion allows immediate controls and pauses automatic rotation', async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(viewport(page).locator(':scope > div')).toHaveCSS('transition-duration', '0s');
  await carousel(page).getByRole('button', { name: 'Previous' }).click();
  await selected(page, 6);
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.clock.fastForward(5200);
  await selected(page, 6);
});

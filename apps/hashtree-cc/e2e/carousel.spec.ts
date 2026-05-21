import { test, expect } from './fixtures';

const FIRST_SLIDE = 'Git repos, file manager, pull requests, issues — all decentralized.';
const SECOND_SLIDE = 'Music player.';
const THIRD_SLIDE = 'Collaborative documents with comments and real-time editing.';

test.describe('Use case carousel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('For Developers').click();
    await expect(page.getByText('Built on Hashtree')).toBeVisible();
  });

  test('shows first slide by default', async ({ page }) => {
    await expect(page.getByAltText('Iris Files')).toBeVisible();
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
  });

  test('slide image is not a hyperlink target', async ({ page }) => {
    await expect(page.locator('a:has(img[alt="Iris Files"])')).toHaveCount(0);
  });

  test('next button advances slide', async ({ page }) => {
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();

    await page.getByLabel('Next').click();
    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).not.toBeVisible();
  });

  test('prev button goes back', async ({ page }) => {
    await page.getByLabel('Next').click();
    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();

    await page.getByLabel('Previous').click();
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
  });

  test('dot navigation works', async ({ page }) => {
    await page.getByLabel('Slide 3').click();
    await expect(page.getByText(THIRD_SLIDE, { exact: true })).toBeVisible();

    await page.getByLabel('Slide 1').click();
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
  });

  test('dragging carousel navigates to next slide', async ({ page }) => {
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();

    const carousel = page.getByRole('region', { name: 'Use case carousel' });
    await carousel.focus();

    const viewport = carousel.locator('.overflow-hidden').first();
    const box = await viewport.boundingBox();

    if (!box) {
      throw new Error('Carousel viewport was not visible');
    }

    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 12 });
    await page.mouse.up();

    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible({ timeout: 1500 });
  });

  test('arrow keys navigate when carousel focused', async ({ page }) => {
    const carousel = page.getByRole('region', { name: 'Use case carousel' });
    await carousel.click();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
  });

  test('auto-advances after timeout', async ({ page }) => {
    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
    // wait for auto-advance (5s interval)
    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible({ timeout: 12000 });
  });

  test('does not auto-advance while hovered', async ({ page }) => {
    const carousel = page.getByRole('region', { name: 'Use case carousel' });

    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
    await carousel.hover();
    await page.getByLabel('Next').click();
    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();

    await page.waitForTimeout(6500);

    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();
    await expect(page.getByText(THIRD_SLIDE, { exact: true })).not.toBeVisible();
  });

  test('does not auto-advance while focused', async ({ page }) => {
    const carousel = page.getByRole('region', { name: 'Use case carousel' });

    await expect(page.getByText(FIRST_SLIDE, { exact: true })).toBeVisible();
    await carousel.click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();

    await page.waitForTimeout(6500);

    await expect(page.getByText(SECOND_SLIDE, { exact: true })).toBeVisible();
    await expect(page.getByText(THIRD_SLIDE, { exact: true })).not.toBeVisible();
  });
});

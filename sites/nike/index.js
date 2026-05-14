import logger from '../../helpers/logger.js';
import { solveCaptcha } from '../../helpers/captcha.js';

const NIKE_BASE = 'https://www.nike.com';

const runNike = async ({ page, task }) => {
  logger.info(`Running Nike checkout for task ${task.id}: ${task.url}`);
  await page.goto(task.url, { waitUntil: 'networkidle2' });
  await selectSize({ page, task });
  await addToCart({ page, task });
  await proceedToCheckout({ page });
  await fillShipping({ page, task });
  await fillPayment({ page, task });
  await submitOrder({ page, task });
};

const selectSize = async ({ page, task }) => {
  logger.info(`Selecting size (Nike) for task ${task.id}`);
};

const addToCart = async ({ page, task }) => {
  logger.info(`Adding to cart (Nike) for task ${task.id}`);
  await page.waitForSelector('[data-testid="add-to-cart-btn"]', { timeout: 10000 });
  await page.click('[data-testid="add-to-cart-btn"]');
};

const proceedToCheckout = async ({ page }) => {
  await page.goto(`${NIKE_BASE}/cart`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[data-testid="checkout-btn"]', { timeout: 10000 });
  await page.click('[data-testid="checkout-btn"]');
};

const fillShipping = async ({ page, task }) => {
  logger.info(`Filling shipping (Nike) for task ${task.id}`);
};

const fillPayment = async ({ page, task }) => {
  logger.info(`Filling payment (Nike) for task ${task.id}`);
};

const submitOrder = async ({ page, task }) => {
  logger.info(`Submitting order (Nike) for task ${task.id}`);
  if (task.auto_solve_captchas) {
    logger.info(`Auto-solving captcha (Nike) for task ${task.id}`);
  }
};

export default runNike;

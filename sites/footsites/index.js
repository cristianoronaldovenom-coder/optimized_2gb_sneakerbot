import logger from '../../helpers/logger.js';
import { solveCaptcha } from '../../helpers/captcha.js';

const FOOTSITES = {
  'footlocker.com': 'Foot Locker',
  'champssports.com': 'Champs Sports',
  'eastbay.com': 'Eastbay',
  'kidsfootlocker.com': 'Kids Foot Locker'
};

const runFootsite = async ({ page, task }) => {
  logger.info(`Running Footsite checkout for task ${task.id}: ${task.url}`);

  await page.goto(task.url, { waitUntil: 'networkidle2' });

  await addToCart({ page, task });
  await proceedToCheckout({ page });
  await fillShipping({ page, task });
  await fillBilling({ page, task });
  await submitOrder({ page, task });
};

const addToCart = async ({ page, task }) => {
  logger.info(`Adding to cart for task ${task.id}`);
  await page.waitForSelector('[data-testid="add-to-cart"]', { timeout: 10000 });
  await page.click('[data-testid="add-to-cart"]');
};

const proceedToCheckout = async ({ page }) => {
  await page.waitForSelector('[data-testid="checkout-button"]', { timeout: 10000 });
  await page.click('[data-testid="checkout-button"]');
};

const fillShipping = async ({ page, task }) => {
  logger.info(`Filling shipping for task ${task.id}`);
};

const fillBilling = async ({ page, task }) => {
  logger.info(`Filling billing for task ${task.id}`);
};

const submitOrder = async ({ page, task }) => {
  logger.info(`Submitting order for task ${task.id}`);
  if (task.auto_solve_captchas) {
    logger.info(`Auto-solving captcha for task ${task.id}`);
  }
};

export default runFootsite;

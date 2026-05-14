import logger from '../../helpers/logger.js';

const runShopify = async ({ page, task }) => {
  logger.info(`Running Shopify checkout for task ${task.id}: ${task.url}`);

  await page.goto(task.url, { waitUntil: 'networkidle2' });

  await addToCart({ page, task });
  await goToCart({ page });
  await proceedToCheckout({ page });
  await fillContactInfo({ page, task });
  await fillShipping({ page, task });
  await fillPayment({ page, task });
  await submitOrder({ page, task });
};

const addToCart = async ({ page, task }) => {
  logger.info(`Adding to cart (Shopify) for task ${task.id}`);
  await page.waitForSelector('button[name="add"]', { timeout: 10000 });
  await page.click('button[name="add"]');
  await page.waitForTimeout(2000);
};

const goToCart = async ({ page }) => {
  await page.goto('/cart', { waitUntil: 'networkidle2' });
};

const proceedToCheckout = async ({ page }) => {
  await page.waitForSelector('[name="checkout"]', { timeout: 10000 });
  await page.click('[name="checkout"]');
};

const fillContactInfo = async ({ page, task }) => {
  logger.info(`Filling contact info (Shopify) for task ${task.id}`);
};

const fillShipping = async ({ page, task }) => {
  logger.info(`Filling shipping (Shopify) for task ${task.id}`);
};

const fillPayment = async ({ page, task }) => {
  logger.info(`Filling payment (Shopify) for task ${task.id}`);
};

const submitOrder = async ({ page, task }) => {
  logger.info(`Submitting order (Shopify) for task ${task.id}`);
};

export default runShopify;

import logger from '../../helpers/logger.js';

const runDemandware = async ({ page, task }) => {
  logger.info(`Running Demandware checkout for task ${task.id}: ${task.url}`);
  await page.goto(task.url, { waitUntil: 'networkidle2' });
  await addToCart({ page, task });
  await proceedToCheckout({ page });
  await fillShipping({ page, task });
  await fillPayment({ page, task });
  await submitOrder({ page, task });
};

const addToCart = async ({ page, task }) => {
  logger.info(`Adding to cart (Demandware) for task ${task.id}`);
  await page.waitForSelector('.add-to-cart', { timeout: 10000 });
  await page.click('.add-to-cart');
};

const proceedToCheckout = async ({ page }) => {
  await page.waitForSelector('.checkout-btn', { timeout: 10000 });
  await page.click('.checkout-btn');
};

const fillShipping = async ({ page, task }) => {
  logger.info(`Filling shipping (Demandware) for task ${task.id}`);
};

const fillPayment = async ({ page, task }) => {
  logger.info(`Filling payment (Demandware) for task ${task.id}`);
};

const submitOrder = async ({ page, task }) => {
  logger.info(`Submitting order (Demandware) for task ${task.id}`);
};

export default runDemandware;

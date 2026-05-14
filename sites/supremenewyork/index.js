import logger from '../../helpers/logger.js';

const SUPREME_BASE = 'https://www.supremenewyork.com';

const runSupreme = async ({ page, task }) => {
  logger.info(`Running Supreme checkout for task ${task.id}: ${task.url}`);
  await page.goto(task.url, { waitUntil: 'networkidle2' });
  await selectStyle({ page, task });
  await selectSize({ page, task });
  await addToCart({ page, task });
  await proceedToCheckout({ page });
  await fillCheckout({ page, task });
  await submitOrder({ page, task });
};

const selectStyle = async ({ page, task }) => {
  logger.info(`Selecting style (Supreme) for task ${task.id}`);
};

const selectSize = async ({ page, task }) => {
  logger.info(`Selecting size (Supreme) for task ${task.id}`);
};

const addToCart = async ({ page, task }) => {
  logger.info(`Adding to cart (Supreme) for task ${task.id}`);
  await page.waitForSelector('input[name="commit"]', { timeout: 10000 });
  await page.click('input[name="commit"]');
};

const proceedToCheckout = async ({ page }) => {
  await page.goto(`${SUPREME_BASE}/shop/cart`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('a.checkout', { timeout: 10000 });
  await page.click('a.checkout');
};

const fillCheckout = async ({ page, task }) => {
  logger.info(`Filling checkout (Supreme) for task ${task.id}`);
};

const submitOrder = async ({ page, task }) => {
  logger.info(`Submitting order (Supreme) for task ${task.id}`);
};

export default runSupreme;

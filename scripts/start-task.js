import db from '../db/index.js';
import logger from '../helpers/logger.js';
import { storePageInTaskCache } from '../helpers/task-cache.js';
import { launchBrowser, getNewPage } from '../helpers/cluster.js';
import { sendSuccessEmail } from '../helpers/email.js';
import { sendDiscordWebhook } from '../helpers/webhook.js';

export const SITES = {
  1: 'footsites',
  2: 'shopify',
  3: 'demandware',
  4: 'nike',
  5: 'supremenewyork',
  6: 'pokemoncenter'
};

const loadTaskWithRelations = async (task) => {
  const enriched = { ...task };

  if (task.shipping_address_id) {
    enriched.shippingAddress = await db('addresses')
      .where({ id: task.shipping_address_id })
      .first();
  }

  if (task.billing_address_id) {
    enriched.billingAddress = await db('addresses')
      .where({ id: task.billing_address_id })
      .first();
  }

  if (task.payment_profile_id) {
    enriched.paymentProfile = await db('payment_profiles')
      .where({ id: task.payment_profile_id })
      .first();
  }

  if (task.proxy_id) {
    enriched.proxy = await db('proxies').where({ id: task.proxy_id }).first();
  }

  return enriched;
};

const startTask = async (task) => {
  const taskId = task.id;
  logger.info(`Starting task ${taskId} — site_id: ${task.site_id}`);

  const enrichedTask = await loadTaskWithRelations(task);
  const { proxy } = enrichedTask;

  let browser;
  try {
    browser = await launchBrowser({ proxy });
    const page = await getNewPage({ browser, proxy });

    storePageInTaskCache({ taskId, page });

    const siteName = SITES[task.site_id];
    if (!siteName) throw new Error(`Unknown site_id: ${task.site_id}`);

    const { default: runSite } = await import(`../sites/${siteName}/index.js`);
    await runSite({ page, task: enrichedTask });

    await db('tasks').where({ id: taskId }).update({ has_been_used: true });

    await sendSuccessEmail({
      to: task.notification_email_address,
      taskId,
      productUrl: task.url
    });

    await sendDiscordWebhook({
      taskId,
      message: `Checkout successful for task ${taskId}: ${task.url}`,
      success: true
    });

    logger.info(`Task ${taskId} completed successfully`);
  } catch (err) {
    logger.error(`Task ${taskId} failed: ${err.message}`);
    await sendDiscordWebhook({
      taskId,
      message: `Task ${taskId} failed: ${err.message}`,
      success: false
    });
  } finally {
    if (browser) await browser.close();
  }
};

export default startTask;

if (process.argv[2]) {
  const taskId = parseInt(process.argv[2]);
  db('tasks')
    .where({ id: taskId })
    .first()
    .then((task) => {
      if (!task) {
        logger.error(`Task ${taskId} not found`);
        process.exit(1);
      }
      return startTask(task);
    })
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err.message);
      process.exit(1);
    });
}

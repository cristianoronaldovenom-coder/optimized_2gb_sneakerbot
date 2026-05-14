import axios from 'axios';
import logger from './logger.js';
import db from '../db/index.js';

export const sendWebhook = async ({ taskId, message, success }) => {
  try {
    const setting = await db('settings').where({ key: 'webhook_url' }).first();
    const webhookUrl = setting?.value;
    if (!webhookUrl) return;

    await axios.post(webhookUrl, {
      taskId,
      message,
      success,
      timestamp: new Date().toISOString()
    });
    logger.info(`Webhook sent for task ${taskId}`);
  } catch (err) {
    logger.error(`Webhook failed for task ${taskId}: ${err.message}`);
  }
};

export const sendDiscordWebhook = async ({ taskId, message, success }) => {
  try {
    const setting = await db('settings').where({ key: 'discord_webhook_url' }).first();
    const webhookUrl = setting?.value;
    if (!webhookUrl) return;

    const color = success ? 0x00ff00 : 0xff0000;
    await axios.post(webhookUrl, {
      embeds: [
        {
          title: success ? 'Checkout Successful!' : 'Checkout Failed',
          description: message,
          color,
          fields: [{ name: 'Task ID', value: String(taskId), inline: true }],
          timestamp: new Date().toISOString()
        }
      ]
    });
    logger.info(`Discord webhook sent for task ${taskId}`);
  } catch (err) {
    logger.error(`Discord webhook failed for task ${taskId}: ${err.message}`);
  }
};

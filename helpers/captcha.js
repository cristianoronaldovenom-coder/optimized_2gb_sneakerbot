import axios from 'axios';
import logger from './logger.js';
import db from '../db/index.js';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 24;

const get2CaptchaKey = async () => {
  const setting = await db('settings').where({ key: 'captcha_api_key' }).first();
  if (!setting?.value) throw new Error('2Captcha API key not configured in Settings');
  return setting.value;
};

export const solveCaptcha = async ({ siteKey, pageUrl }) => {
  const apiKey = await get2CaptchaKey();

  const { data: submitData } = await axios.get(
    `http://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${encodeURIComponent(siteKey)}&pageurl=${encodeURIComponent(pageUrl)}&json=1`
  );

  if (submitData.status !== 1) throw new Error(`reCAPTCHA submit failed: ${submitData.request}`);

  return pollResult(apiKey, submitData.request);
};

export const solveHCaptcha = async ({ siteKey, pageUrl }) => {
  const apiKey = await get2CaptchaKey();

  const { data: submitData } = await axios.get(
    `http://2captcha.com/in.php?key=${apiKey}&method=hcaptcha&sitekey=${encodeURIComponent(siteKey)}&pageurl=${encodeURIComponent(pageUrl)}&json=1`
  );

  if (submitData.status !== 1) throw new Error(`hCaptcha submit failed: ${submitData.request}`);

  return pollResult(apiKey, submitData.request);
};

export const solveCloudflareTurnstile = async ({ siteKey, pageUrl }) => {
  const apiKey = await get2CaptchaKey();

  const { data: submitData } = await axios.post('https://2captcha.com/in.php', null, {
    params: { key: apiKey, method: 'turnstile', sitekey: siteKey, pageurl: pageUrl, json: 1 }
  });

  if (submitData.status !== 1) throw new Error(`Turnstile submit failed: ${submitData.request}`);

  return pollResult(apiKey, submitData.request);
};

const pollResult = async (apiKey, captchaId) => {
  logger.info(`[Captcha] Submitted — polling for result (id: ${captchaId})`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const { data } = await axios.get(
      `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`
    );

    if (data.status === 1) {
      logger.info(`[Captcha] Solved (id: ${captchaId})`);
      return data.request;
    }

    if (data.request !== 'CAPCHA_NOT_READY') {
      throw new Error(`Captcha solve failed: ${data.request}`);
    }

    logger.info(`[Captcha] Not ready yet (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
  }

  throw new Error('Captcha solve timed out after 2 minutes');
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

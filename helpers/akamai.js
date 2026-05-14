import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BMP_PORT = 1337;
const BMP_HOST = '127.0.0.1';
const BMP_URL = `http://${BMP_HOST}:${BMP_PORT}/akamai/bmp`;
const BINARY = join(__dirname, '..', 'vendor', 'akamai-bmp-server');
const DEVICES = join(__dirname, '..', 'vendor', 'akamai-bmp-devices.json');

let serverProcess = null;
let serverReady = false;

export const startAkamaiServer = () => {
  return new Promise((resolve) => {
    if (serverReady) return resolve(true);

    logger.info('[Akamai] Starting BMP generator server...');

    serverProcess = spawn(BINARY, [
      '--host', BMP_HOST,
      '--port', String(BMP_PORT),
      '--devicepath', DEVICES
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      logger.info(`[Akamai] ${msg}`);
      if (msg.includes('Starting server')) {
        serverReady = true;
        resolve(true);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      logger.warn(`[Akamai] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      logger.error(`[Akamai] Failed to start server: ${err.message}`);
      serverReady = false;
      resolve(false);
    });

    serverProcess.on('exit', (code) => {
      logger.warn(`[Akamai] Server exited with code ${code}`);
      serverReady = false;
    });

    setTimeout(() => {
      if (!serverReady) {
        serverReady = true;
        resolve(true);
      }
    }, 3000);
  });
};

export const stopAkamaiServer = () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    serverReady = false;
    logger.info('[Akamai] BMP server stopped');
  }
};

const APP_MAP = {
  'pokemoncenter.com': 'com.pokemoncenter.app',
  'footlocker.com':    'com.footlocker.confirmed',
  'nike.com':          'com.nike.omega',
  'jdsports.com':      'com.jd.sports',
  'adidas.com':        'com.adidas.confirmed.app',
  default:             'com.example.app'
};

const getAppId = (url) => {
  try {
    const host = new URL(url).hostname;
    for (const [domain, appId] of Object.entries(APP_MAP)) {
      if (host.includes(domain)) return appId;
    }
  } catch (_) {}
  return APP_MAP.default;
};

export const getAkamaiSensor = async ({ url, version = '3.3.4', challenge = false }) => {
  if (!serverReady) {
    const started = await startAkamaiServer();
    if (!started) {
      logger.warn('[Akamai] Server not available — skipping sensor generation');
      return null;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    const body = JSON.stringify({
      app: getAppId(url),
      lang: 'en_CA',
      version,
      challenge,
      powUrl: url
    });

    const res = await fetch(BMP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      logger.warn(`[Akamai] BMP server returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    logger.info(`[Akamai] Sensor generated — device: ${data.brand} ${data.model} (Android ${data.androidVersion})`);
    return data;
  } catch (err) {
    logger.warn(`[Akamai] Sensor request failed: ${err.message}`);
    return null;
  }
};

export const submitAkamaiSensor = async ({ sensorData, pageUrl, existingAbck, ua }) => {
  try {
    const origin = new URL(pageUrl).origin;
    const bmUrl = `${origin}/_bm/ajax_done`;

    const res = await fetch(bmUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'origin': origin,
        'referer': pageUrl,
        'accept': '*/*',
        'accept-language': 'en-CA,en-US;q=0.9',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        ...(existingAbck ? { 'cookie': `_abck=${existingAbck}` } : {})
      },
      body: `sensor_data=${encodeURIComponent(sensorData)}`,
      signal: AbortSignal.timeout(10000)
    });

    const setCookie = res.headers.get('set-cookie') || '';
    const abckMatch = setCookie.match(/_abck=([^;]+)/);

    if (abckMatch) {
      logger.info(`[Akamai] New _abck cookie obtained`);
      return abckMatch[1];
    }

    logger.warn(`[Akamai] No _abck in response (status ${res.status})`);
    return null;
  } catch (err) {
    logger.warn(`[Akamai] Sensor submit failed: ${err.message}`);
    return null;
  }
};

export const detectAndSolveAkamai = async ({ html, pageUrl, ua, sessionCookies }) => {
  const isAkamaiBlock =
    /_abck/i.test(html) ||
    /bm\.tst\.net/i.test(html) ||
    /akamai/i.test(html.slice(0, 4000)) ||
    /Bot Management/i.test(html);

  if (!isAkamaiBlock) return null;

  const host = new URL(pageUrl).hostname;
  const existing = sessionCookies?.get?.(host) || '';
  const abckMatch = existing.match(/_abck=([^;]+)/);
  const existingAbck = abckMatch ? abckMatch[1] : null;

  logger.info(`[Akamai] Bot challenge detected on ${host}`);

  const sensorResult = await getAkamaiSensor({ url: pageUrl });
  if (!sensorResult?.sensor) return null;

  const newAbck = await submitAkamaiSensor({
    sensorData: sensorResult.sensor,
    pageUrl,
    existingAbck,
    ua
  });

  if (!newAbck) return null;

  const prev = sessionCookies?.get?.(host) || '';
  const merged = prev
    ? (prev.includes('_abck=')
        ? prev.replace(/_abck=[^;]*/i, `_abck=${newAbck}`)
        : `${prev}; _abck=${newAbck}`)
    : `_abck=${newAbck}`;

  sessionCookies?.set?.(host, merged);
  logger.info(`[Akamai] _abck cookie refreshed for ${host}`);
  return newAbck;
};

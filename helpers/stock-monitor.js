import { gotScraping } from 'got-scraping';
import logger from './logger.js';
import { detectAndSolveDataDome } from './datadome.js';
import { detectAndSolveAkamai } from './akamai.js';
import { warmSession, isImpervaChallenged } from './session-warmer.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

let uaIndex = 0;
const nextUA = () => USER_AGENTS[uaIndex++ % USER_AGENTS.length];

const sessionCookies = new Map();

const buildHeaders = (ua) => ({
  'User-Agent': ua,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8,fr-CA;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'DNT': '1'
});

const BOT_BLOCK_PATTERNS = [
  /pardon our interruption/i,
  /access denied/i,
  /captcha/i,
  /verify you are human/i,
  /just a moment/i,
  /ddos-guard/i,
  /enable javascript and cookies/i,
  /challenge-platform/i,
  /ray id/i
];

export const checkStock = async (productUrl) => {
  const ua = nextUA();
  const host = new URL(productUrl).hostname;
  const existingCookies = sessionCookies.get(host) || '';

  try {
    const response = await gotScraping({
      url: productUrl,
      headerGeneratorOptions: {
        browsers: [{ name: 'chrome', minVersion: 120 }],
        devices: ['desktop'],
        locales: ['en-CA', 'en-US'],
        operatingSystems: ['windows', 'macos']
      },
      headers: {
        ...buildHeaders(ua),
        ...(existingCookies ? { Cookie: existingCookies } : {})
      },
      followRedirect: true,
      maxRedirects: 6,
      timeout: { request: 12000 },
      decompress: true,
      https: { rejectUnauthorized: false }
    });

    const html = response.body;
    const status = response.statusCode;
    const setCookieHeader = response.headers['set-cookie'];

    if (setCookieHeader) {
      const cookieStr = Array.isArray(setCookieHeader)
        ? setCookieHeader.map(c => c.split(';')[0]).join('; ')
        : setCookieHeader.split(';')[0];
      sessionCookies.set(host, cookieStr);
    }

    if (status === 403 || status === 429 || status === 503) {
      logger.warn(`[StockMonitor] HTTP ${status} from ${productUrl} — rotating identity`);
      sessionCookies.delete(host);
      return { inStock: false, productName: null, price: null, imageUrl: null, blocked: true, error: `HTTP ${status} — bot protection` };
    }

    if (isImpervaChallenged(html, setCookieHeader)) {
      logger.info(`[StockMonitor] Imperva JS challenge detected on ${host} — warming session`);
      warmSession(productUrl, sessionCookies);
      return { inStock: false, productName: null, price: null, imageUrl: null, blocked: true, error: 'Imperva challenge — warming session (retry in ~25s)' };
    }

    const ddCookie = await detectAndSolveDataDome({ html, pageUrl: productUrl, ua, sessionCookies });
    if (ddCookie) {
      const prev = sessionCookies.get(host) || '';
      const merged = prev
        ? prev.replace(/datadome=[^;]*/i, `datadome=${ddCookie}`)
        : `datadome=${ddCookie}`;
      sessionCookies.set(host, merged);
      logger.info(`[StockMonitor] DataDome cookie refreshed for ${host} — will retry next cycle`);
      return { inStock: false, productName: null, price: null, imageUrl: null, blocked: true, error: 'DataDome solved — retrying next cycle' };
    }

    const akamaiCookie = await detectAndSolveAkamai({ html, pageUrl: productUrl, ua, sessionCookies });
    if (akamaiCookie) {
      logger.info(`[StockMonitor] Akamai _abck refreshed for ${host} — will retry next cycle`);
      return { inStock: false, productName: null, price: null, imageUrl: null, blocked: true, error: 'Akamai solved — retrying next cycle' };
    }

    const checkZone = html.slice(0, 3000);
    for (const pattern of BOT_BLOCK_PATTERNS) {
      if (pattern.test(checkZone)) {
        logger.warn(`[StockMonitor] Bot challenge detected on ${productUrl} — clearing session`);
        sessionCookies.delete(host);
        return { inStock: false, productName: null, price: null, imageUrl: null, blocked: true, error: 'Bot challenge page — retrying next cycle' };
      }
    }

    const inStock = isInStock(html);
    const productName = extractProductName(html);
    const price = extractPrice(html);
    const imageUrl = extractImage(html);

    return { inStock, productName, price, imageUrl, blocked: false, error: null };

  } catch (err) {
    const isTimeout = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.message?.includes('timeout');
    logger.warn(`[StockMonitor] Request failed for ${productUrl}: ${err.message}`);
    if (isTimeout) {
      return { inStock: false, productName: null, price: null, imageUrl: null, blocked: false, error: 'Request timed out — retrying' };
    }
    sessionCookies.delete(host);
    return { inStock: false, productName: null, price: null, imageUrl: null, blocked: false, error: err.message };
  }
};

const isInStock = (html) => {
  const outOfStockPatterns = [
    /class="[^"]*not-available[^"]*"/i,
    /"availability":\s*"not-available"/i,
    /data-available="false"/i,
    /"orderable"\s*:\s*false/i,
    /class="[^"]*out-of-stock[^"]*"/i,
    /"ATS"\s*:\s*0\b/i
  ];
  const inStockPatterns = [
    /add-to-cart(?!.*disabled)/i,
    /"orderable"\s*:\s*true/i,
    /"availability"\s*:\s*"PREORDER"/i,
    /"availability"\s*:\s*"IN_STOCK"/i,
    /data-available="true"/i,
    /"ATS"\s*:\s*[1-9]/i
  ];

  if (/add-to-cart[^>]*disabled/i.test(html)) return false;
  for (const p of outOfStockPatterns) { if (p.test(html)) return false; }
  for (const p of inStockPatterns)    { if (p.test(html)) return true;  }
  return false;
};

const extractProductName = (html) => {
  const m =
    html.match(/<title>([^<]+)<\/title>/i) ||
    html.match(/"name"\s*:\s*"([^"]+)"/i) ||
    html.match(/class="[^"]*product-name[^"]*"[^>]*>\s*([^<]{3,80})/i);
  return m ? m[1].replace(/\s*[-|].*$/, '').trim() : null;
};

const extractPrice = (html) => {
  const m =
    html.match(/"price"\s*:\s*\{[^}]*"sales"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/i) ||
    html.match(/class="[^"]*sales[^"]*"[^>]*>\s*<span[^>]*>\s*\$?([\d.,]+)/i) ||
    html.match(/"\$?([\d]{1,4}\.\d{2})"/);
  return m ? `$${parseFloat(m[1]).toFixed(2)} CAD` : null;
};

const extractImage = (html) => {
  const m =
    html.match(/"primaryImage"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/i) ||
    html.match(/property="og:image"\s+content="([^"]+)"/i) ||
    html.match(/class="[^"]*primary-image[^"]*"[^>]*src="([^"]+)"/i);
  return m ? m[1] : null;
};

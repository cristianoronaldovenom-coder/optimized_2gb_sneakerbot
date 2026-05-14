import logger from './logger.js';

const warmingInProgress = new Set();
const WARM_TIMEOUT = 25000;

const isImpervaChallenged = (html, setCookieHeader) => {
  if (!html) return false;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader.join(' ')
    : (setCookieHeader || '');
  const hasIncapCookie = /visid_incap|incap_ses/i.test(cookies);
  const hasChallengePage = /onProtectionInitialized|Pardon Our Interruption|reeseSkipExpiration/i.test(html.slice(0, 3000));
  return hasIncapCookie && hasChallengePage;
};

export const warmSession = async (url, sessionCookies) => {
  const host = new URL(url).hostname;

  if (warmingInProgress.has(host)) {
    logger.info(`[SessionWarmer] Already warming ${host}, skipping duplicate`);
    return false;
  }

  warmingInProgress.add(host);
  logger.info(`[SessionWarmer] Launching stealth browser to solve Imperva challenge for ${host}`);

  let browser;
  try {
    const { launchBrowser, getNewPage } = await import('./cluster.js');
    browser = await launchBrowser({});
    const page = await getNewPage({ browser, proxy: null });

    page.setDefaultNavigationTimeout(WARM_TIMEOUT);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: WARM_TIMEOUT });

    await page.waitForFunction(
      () => {
        const title = document.title || '';
        const h1 = document.querySelector('h1')?.textContent || '';
        return !title.includes('Pardon') && !h1.includes('Pardon') && !window.onProtectionInitialized;
      },
      { timeout: 15000, polling: 500 }
    ).catch(() => {
      logger.warn(`[SessionWarmer] Challenge may not have resolved for ${host}`);
    });

    await new Promise(r => setTimeout(r, 1500));

    const puppeteerCookies = await page.cookies();
    if (puppeteerCookies.length === 0) {
      logger.warn(`[SessionWarmer] No cookies obtained for ${host}`);
      return false;
    }

    const cookieStr = puppeteerCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    sessionCookies.set(host, cookieStr);

    const incapCount = puppeteerCookies.filter(c =>
      c.name.startsWith('visid_incap') || c.name.startsWith('incap_ses') || c.name === 'reese84'
    ).length;

    logger.info(`[SessionWarmer] ✅ Session warmed for ${host} — ${puppeteerCookies.length} cookies (${incapCount} Imperva)`);
    return true;
  } catch (err) {
    logger.error(`[SessionWarmer] Failed for ${host}: ${err.message}`);
    return false;
  } finally {
    warmingInProgress.delete(host);
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
};

export { isImpervaChallenged };

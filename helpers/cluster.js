import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import logger from './logger.js';

puppeteerExtra.use(StealthPlugin());

const UC_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-infobars',
  '--disable-blink-features=AutomationControlled',
  '--disable-extensions',
  '--disable-plugins-discovery',
  '--disable-default-apps',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-translate',
  '--hide-scrollbars',
  '--mute-audio',
  '--safebrowsing-disable-auto-update',
  '--metrics-recording-only',
  '--use-mock-keychain',
  '--ignore-certificate-errors',
  '--allow-running-insecure-content',
  '--window-size=1280,800',
  '--disable-features=site-per-process',
  '--memory-pressure-off',
  '--max_old_space_size=512',
  '--disable-features=TranslateUI',
  '--disable-ipc-flooding-protection',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-breakpad',
  '--disk-cache-size=1',
  '--media-cache-size=1'
];

const STEALTH_SCRIPT = `
  (() => {
    /* 1 — Remove navigator.webdriver */
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    /* 2 — Realistic plugin list */
    const makePlugin = (name, desc, filename, mimeTypes) => {
      const plugin = Object.create(Plugin.prototype);
      Object.defineProperties(plugin, {
        name:        { value: name, enumerable: true },
        description: { value: desc, enumerable: true },
        filename:    { value: filename, enumerable: true },
        length:      { value: mimeTypes.length, enumerable: true }
      });
      mimeTypes.forEach((mt, i) => {
        const mime = Object.create(MimeType.prototype);
        Object.defineProperties(mime, {
          type:        { value: mt.type, enumerable: true },
          suffixes:    { value: mt.suffixes, enumerable: true },
          description: { value: mt.description, enumerable: true },
          enabledPlugin: { value: plugin, enumerable: true }
        });
        Object.defineProperty(plugin, i, { value: mime, enumerable: true });
      });
      return plugin;
    };
    const plugins = [
      makePlugin('Chrome PDF Plugin', 'Portable Document Format', 'internal-pdf-viewer',
        [{ type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }]),
      makePlugin('Chrome PDF Viewer', '', 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
        [{ type: 'application/pdf', suffixes: 'pdf', description: '' }]),
      makePlugin('Native Client', '', 'internal-nacl-plugin',
        [{ type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
         { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' }])
    ];
    const pluginArray = Object.create(PluginArray.prototype);
    Object.defineProperty(pluginArray, 'length', { value: plugins.length });
    plugins.forEach((p, i) => Object.defineProperty(pluginArray, i, { value: p, enumerable: true }));
    ['item', 'namedItem', 'refresh'].forEach(k => {
      Object.defineProperty(pluginArray, k, { value: PluginArray.prototype[k] });
    });
    Object.defineProperty(navigator, 'plugins', { get: () => pluginArray });

    /* 3 — Languages */
    Object.defineProperty(navigator, 'languages', { get: () => ['en-CA', 'en-US', 'en'] });

    /* 4 — window.chrome */
    if (!window.chrome) {
      window.chrome = { runtime: {}, app: {}, csi: () => {}, loadTimes: () => {} };
    }

    /* 5 — Permissions API */
    const origQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
    window.navigator.permissions.query = (params) =>
      params.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : origQuery(params);

    /* 6 — WebGL fingerprint */
    const getParam = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel Iris OpenGL Engine';
      return getParam.call(this, param);
    };
    try {
      const getParam2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (param) {
        if (param === 37445) return 'Intel Inc.';
        if (param === 37446) return 'Intel Iris OpenGL Engine';
        return getParam2.call(this, param);
      };
    } catch (_) {}

    /* 7 — Screen */
    Object.defineProperty(screen, 'width',  { get: () => 1920 });
    Object.defineProperty(screen, 'height', { get: () => 1080 });
    Object.defineProperty(screen, 'availWidth',  { get: () => 1920 });
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
    Object.defineProperty(window, 'outerWidth',  { get: () => 1280 });
    Object.defineProperty(window, 'outerHeight', { get: () => 800 });
  })();
`;

export const launchBrowser = async ({ proxy } = {}) => {
  const args = [...UC_ARGS];

  if (proxy) {
    args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
  }

  const browser = await puppeteerExtra.launch({
    headless: true,
    executablePath: '/nix/store/43y6k6fj85l4kcd1yan43hpdld6nmjmp-ungoogled-chromium-131.0.6778.204/bin/chromium',
    args,
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ['--enable-automation']
  });

  logger.info('[Browser] Launched with UC-mode flags');
  return browser;
};

export const getNewPage = async ({ browser, proxy }) => {
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', (req) => {
    const type = req.resourceType();

    if (['image', 'font', 'media'].includes(type)) {
      return req.abort();
    }

    req.continue();
  });

  try {
    const cdp = await page.target().createCDPSession();
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: STEALTH_SCRIPT });
    await cdp.send('Network.setExtraHTTPHeaders', {
      headers: { 'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8' }
    });
  } catch (err) {
    logger.warn(`[Browser] CDP setup warning: ${err.message}`);
  }

  await page.evaluateOnNewDocument(STEALTH_SCRIPT);
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  if (proxy?.username) {
    await page.authenticate({ username: proxy.username, password: proxy.password });
  }

  logger.info('[Browser] New page ready with stealth CDP injection');
  return page;
};

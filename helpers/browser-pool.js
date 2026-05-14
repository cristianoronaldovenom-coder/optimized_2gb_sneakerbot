import puppeteer from 'puppeteer-extra';

let browser;

export async function getBrowser() {
  if (browser?.connected) {
    return browser;
  }

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-extensions',
      '--disable-sync',
      '--mute-audio',
    ],
  });

  return browser;
}

export async function optimizePage(page) {
  await page.setRequestInterception(true);

  page.on('request', request => {
    const type = request.resourceType();

    if (['image', 'media', 'font'].includes(type)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  page.setDefaultTimeout(30000);

  return page;
}


import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

class BrowserPool {
  constructor() {
    this.browser = null;
  }

  async getBrowser() {
    if (this.browser) return this.browser;

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--memory-pressure-off',
        '--max_old_space_size=512'
      ]
    });

    return this.browser;
  }

  async newPage() {
    const browser = await this.getBrowser();
    return browser.newPage();
  }

  async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default new BrowserPool();

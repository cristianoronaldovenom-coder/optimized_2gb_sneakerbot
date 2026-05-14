
import axios from 'axios';
import crypto from 'crypto';

export class SmartMonitor {
  constructor() {
    this.cache = new Map();
  }

  async monitor(url, options = {}) {
    const start = Date.now();

    try {
      const response = await axios.get(url, {
        timeout: options.timeout || 5000,
        headers: {
          'user-agent': options.userAgent || 'Mozilla/5.0 SneakerBotLite',
          'cache-control': 'no-cache'
        },
        validateStatus: () => true
      });

      const body = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      const hash = crypto.createHash('md5').update(body).digest('hex');
      const previousHash = this.cache.get(url);

      const changed = previousHash && previousHash !== hash;

      this.cache.set(url, hash);

      return {
        success: true,
        changed,
        status: response.status,
        latency: Date.now() - start,
        inStock: this.detectStock(body)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        latency: Date.now() - start
      };
    }
  }

  detectStock(body) {
    const text = body.toLowerCase();

    const positive = [
      'add to cart',
      'in stock',
      'available',
      'checkout'
    ];

    const negative = [
      'sold out',
      'out of stock',
      'unavailable'
    ];

    if (negative.some(x => text.includes(x))) return false;

    return positive.some(x => text.includes(x));
  }
}

export default new SmartMonitor();

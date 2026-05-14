
const axios = require('axios');
const EventEmitter = require('events');

class APIMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.url = options.url;
    this.interval = options.interval || 5000;
    this.timeout = options.timeout || 10000;
    this.method = options.method || 'GET';
    this.headers = options.headers || {};
    this.keyword = options.keyword || 'in_stock';
    this.running = false;
    this.lastHash = null;
  }

  async start() {
    this.running = true;

    while (this.running) {
      try {
        const response = await axios({
          url: this.url,
          method: this.method,
          headers: this.headers,
          timeout: this.timeout,
          validateStatus: () => true
        });

        const body = JSON.stringify(response.data);

        const hash = Buffer.from(body)
          .toString('base64')
          .slice(0, 32);

        if (this.lastHash && this.lastHash !== hash) {
          this.emit('change', {
            url: this.url,
            status: response.status
          });
        }

        this.lastHash = hash;

        if (body.includes(this.keyword)) {
          this.emit('stock', {
            url: this.url,
            keyword: this.keyword,
            status: response.status
          });
        }

      } catch (err) {
        this.emit('error', {
          url: this.url,
          error: err.message
        });
      }

      await new Promise(r => setTimeout(r, this.interval));
    }
  }

  stop() {
    this.running = false;
  }
}

module.exports = APIMonitor;

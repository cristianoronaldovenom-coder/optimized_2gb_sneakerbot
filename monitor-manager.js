
const APIMonitor = require('./api-monitor');

class MonitorManager {
  constructor() {
    this.monitors = new Map();
  }

  create(id, options) {
    if (this.monitors.has(id)) {
      return this.monitors.get(id);
    }

    const monitor = new APIMonitor(options);

    monitor.on('stock', data => {
      console.log(`[STOCK] ${data.url}`);
    });

    monitor.on('change', data => {
      console.log(`[CHANGE] ${data.url}`);
    });

    monitor.on('error', data => {
      console.error(`[ERROR] ${data.url} ${data.error}`);
    });

    this.monitors.set(id, monitor);

    return monitor;
  }

  async start(id) {
    const monitor = this.monitors.get(id);

    if (!monitor) {
      throw new Error('Monitor not found');
    }

    monitor.start();
  }

  stop(id) {
    const monitor = this.monitors.get(id);

    if (!monitor) return;

    monitor.stop();

    this.monitors.delete(id);
  }
}

module.exports = MonitorManager;

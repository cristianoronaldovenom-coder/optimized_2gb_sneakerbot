
export class ProxyHealthManager {
  constructor() {
    this.proxies = new Map();
  }

  update(proxy, success, latency = 0) {
    if (!this.proxies.has(proxy)) {
      this.proxies.set(proxy, {
        success: 0,
        fail: 0,
        latency: 0,
        score: 100
      });
    }

    const data = this.proxies.get(proxy);

    if (success) data.success++;
    else data.fail++;

    data.latency = latency;

    data.score =
      (data.success * 10) -
      (data.fail * 15) -
      Math.floor(latency / 100);

    this.proxies.set(proxy, data);
  }

  best() {
    return [...this.proxies.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .map(x => x[0]);
  }
}

export default new ProxyHealthManager();

const monitors = {};
const clients = {};

export const getMonitor = (taskId) => monitors[taskId];

export const setMonitor = (taskId, data) => {
  monitors[taskId] = { ...monitors[taskId], ...data, updatedAt: Date.now() };
};

export const clearMonitor = (taskId) => {
  if (monitors[taskId]?.intervalId) {
    clearInterval(monitors[taskId].intervalId);
  }
  delete monitors[taskId];
  broadcastToClients(taskId, { status: 'stopped' });
};

export const isMonitoring = (taskId) => !!monitors[taskId]?.active;

export const getAllMonitors = () => monitors;

export const addClient = (taskId, res) => {
  if (!clients[taskId]) clients[taskId] = new Set();
  clients[taskId].add(res);
};

export const removeClient = (taskId, res) => {
  clients[taskId]?.delete(res);
  if (clients[taskId]?.size === 0) delete clients[taskId];
};

export const broadcastToClients = (taskId, data) => {
  const taskClients = clients[taskId];
  if (!taskClients || taskClients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of taskClients) {
    try { res.write(payload); } catch (_) {}
  }
};

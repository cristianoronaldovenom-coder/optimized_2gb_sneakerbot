
module.exports = {
  apps: [{
    name: "sneakerbot",
    script: "server.js",
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "850M",
    node_args: "--max-old-space-size=768 --optimize-for-size",
    env: {
      NODE_ENV: "production"
    }
  }]
}

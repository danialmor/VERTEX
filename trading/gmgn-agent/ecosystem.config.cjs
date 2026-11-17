module.exports = {
  apps: [
    {
      name: 'gmgnAgent',
      script: 'agent/index.js',
      interpreter: '/root/.bun/bin/bun',
      cwd: '/root/trader',
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};

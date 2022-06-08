/**
 * @type {import('vite').UserConfig}
 */
const config = {
  server: {
    hmr: {},
  },
};

if (process.env.GITPOD_WORKSPACE_URL) {
  config.server.hmr = {
    clientPort: 443,
    host: `3000-${process.env.GITPOD_WORKSPACE_ID}.${process.env.GITPOD_WORKSPACE_CLUSTER_HOST}`,
  };
}

export default config;

/**
 * @type {import('vite').UserConfig}
 */
const config = {
  server: {},
};

if (process.env.GITPOD_WORKSPACE_URL) {
  config.server.hmr = {
    clientPort: 443,
  };
}

export default config;

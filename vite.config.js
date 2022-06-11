const { resolve } = require("path");

/**
 * @type {import('vite').UserConfig}
 */
const config = {
  server: {
    hmr: {},
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        play: resolve(__dirname, "play/index.html"),
      },
    },
  },
};

if (process.env.GITPOD_WORKSPACE_URL) {
  config.server.hmr = {
    clientPort: 443,
    host: `3000-${process.env.GITPOD_WORKSPACE_ID}.${process.env.GITPOD_WORKSPACE_CLUSTER_HOST}`,
  };
}

export default config;

/**
 * @type {import('vite').UserConfig}
 */
const config = {
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
};

if (process.env.GITPOD_WORKSPACE_URL) {
  config.server.hmr = {
    clientPort: 443,
  };
}

export default config;

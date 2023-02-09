/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  serverBuildDirectory: "build",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  devServerPort: 9002,
  future: {
    unstable_dev: true,
  },
};

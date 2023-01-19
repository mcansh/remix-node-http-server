const http = require("http");
const path = require("path");
const fs = require("fs/promises");
const { constants } = require("fs");
const { createRequestHandler } = require("@mcansh/remix-raw-http");
const send = require("@fastify/send");

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "server/build");

async function checkFileExists(filepath) {
  try {
    let file = await fs.stat(filepath, constants.F_OK);
    return file.isFile();
  } catch {
    return false;
  }
}

async function serveFile(req, res) {
  let filePath = path.join(process.cwd(), "public", req.url);
  let fileExists = await checkFileExists(filePath);
  if (!fileExists) return undefined;
  let isBuildAsset = req.url.startsWith("/build");
  return send(req, filePath, {
    immutable: MODE === "production" && isBuildAsset,
    maxAge: MODE === "production" && isBuildAsset ? "1y" : 0,
  });
}

let server = http.createServer(async (req, res) => {
  try {
    if (MODE !== "production") {
      purgeRequireCache();
    }
    let fileStream = await serveFile(req, res);
    if (fileStream) {
      return fileStream.pipe(res);
    }
    let build = require("./build");
    createRequestHandler({ build, mode: MODE })(req, res);
  } catch (error) {
    console.error(error);
  }
});

let port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

////////////////////////////////////////////////////////////////////////////////
function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (let key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}

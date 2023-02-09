const http = require("http");
const path = require("path");
const fs = require("fs/promises");
const { constants } = require("fs");
const { createRequestHandler } = require("@mcansh/remix-raw-http");
const send = require("@fastify/send");

const MODE = process.env.NODE_ENV;

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
    let fileStream = await serveFile(req, res);
    if (fileStream) return fileStream.pipe(res);
    let build = require("./build");
    createRequestHandler({ build, mode: MODE })(req, res);
  } catch (error) {
    console.error(error);
  }
});

let port = Number(process.env.PORT) || 3000;

server.listen(port, () => {
  console.log(`✅ app ready: http://localhost:${port}`);
});

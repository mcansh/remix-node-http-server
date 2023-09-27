import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { createRequestHandler, getURL } from "@mcansh/remix-raw-http";
import send from "@fastify/send";
import { installGlobals, broadcastDevReady } from "@remix-run/node";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();
installGlobals();

let BUILD_PATH = "./build/index.js";
let VERSION_PATH = "./build/version.txt";

/** @typedef {import('@remix-run/node').ServerBuild} ServerBuild */

let initialBuild = await import(BUILD_PATH);

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {import('@fastify/send').SendStream | undefined}
 */
async function getFileStream(req) {
  let url = getURL(req);
  let filePath = path.join(process.cwd(), "public", url.pathname);

  let stat = fs.statSync(filePath);
  if (!fs.existsSync(filePath) || !stat.isFile()) {
    return undefined;
  }

  let isBuildAsset = req.url.startsWith("/build");
  return send(req, filePath, {
    immutable: process.env.NODE_ENV === "production" && isBuildAsset,
    maxAge: process.env.NODE_ENV === "production" && isBuildAsset ? "1y" : 0,
  });
}

/** @type {import('node:http').Server} */
let server = http.createServer(async (req, res) => {
  try {
    let fileStream = await getFileStream(req);
    if (fileStream) return fileStream.pipe(res);

    if (process.env.NODE_ENV === "development") {
      let handler = await createDevRequestHandler(initialBuild);
      return handler(req, res);
    }

    let handler = createRequestHandler({
      build: initialBuild,
      mode: initialBuild.mode,
    });
    return handler(req, res);
  } catch (error) {
    console.error(error);
  }
});

let port = Number(process.env.PORT) || 3000;

server.listen(port, async () => {
  console.log(`✅ app ready: http://localhost:${port}`);
  if (process.env.NODE_ENV === "development") {
    await broadcastDevReady(initialBuild);
  }
});

/**
 * @param {ServerBuild} initialBuild
 * @param {import('@mcansh/remix-raw-http').GetLoadContextFunction} [getLoadContext]
 * @returns {import('@mcansh/remix-raw-http').RequestHandler}
 */
async function createDevRequestHandler(initialBuild, getLoadContext) {
  let build = initialBuild;

  async function handleServerUpdate() {
    // 1. re-import the server build
    build = await reimportServer();
    // 2. tell Remix that this app server is now up-to-date and ready
    await broadcastDevReady(build);
  }

  let chokidar = await import("chokidar");
  chokidar
    .watch(VERSION_PATH, { ignoreInitial: true })
    .on("add", handleServerUpdate)
    .on("change", handleServerUpdate);

  return async (...args) => {
    let handler = createRequestHandler({
      build,
      getLoadContext,
      mode: "development",
    });

    return handler(...args);
  };
}

/** @returns {Promise<ServerBuild>} */
async function reimportServer() {
  let stat = fs.statSync(BUILD_PATH);

  // convert build path to URL for Windows compatibility with dynamic `import`
  let BUILD_URL = url.pathToFileURL(BUILD_PATH).href;

  // use a timestamp query parameter to bust the import cache
  return import(BUILD_URL + "?t=" + stat.mtimeMs);
}

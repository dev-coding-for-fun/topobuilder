const { createReadStream, existsSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, join, normalize, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve('dist');
const port = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 8091);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const exportResult = spawnSync(npx, ['expo', 'export', '--platform', 'web'], {
  stdio: 'inherit',
});

if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);
  const requested = normalize(join(root, pathname));
  const filePath =
    requested.startsWith(root) && existsSync(requested) && statSync(requested).isFile()
      ? requested
      : join(root, 'index.html');
  const extension = extname(filePath);

  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Content-Type', mimeTypes[extension] ?? 'application/octet-stream');
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});

function shutdown() {
  const forceExit = setTimeout(() => {
    process.exit(0);
  }, 1000);
  forceExit.unref?.();

  server.close(() => {
    process.exit(0);
  });
  server.closeIdleConnections?.();
  server.closeAllConnections?.();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);
process.on('SIGBREAK', shutdown);

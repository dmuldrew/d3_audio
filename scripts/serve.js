import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  // Normalize URL
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(rootDir, reqPath);

  // Security check: ensure filePath is within rootDir
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      // If file not found, check if directory with index.html
      const tryIndex = path.join(filePath, 'index.html');
      fs.stat(tryIndex, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(tryIndex, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found: ' + reqPath);
        }
      });
      return;
    }

    if (stats.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      fs.stat(indexFile, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(indexFile, res);
        } else {
          // List directory contents
          fs.readdir(filePath, (err3, files) => {
            if (err3) {
              res.writeHead(500);
              res.end('Error reading directory');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head><title>Index of ${reqPath}</title></head>
              <body style="font-family: sans-serif; padding: 20px;">
                <h2>Index of ${reqPath}</h2>
                <ul>
                  <li><a href="..">.. (Parent Directory)</a></li>
                  ${files.map(f => `<li><a href="${path.posix.join(reqPath, f)}">${f}</a></li>`).join('')}
                </ul>
              </body>
              </html>
            `);
          });
        }
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(file, res) {
  const ext = path.extname(file).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 d3-audio server running at http://localhost:${PORT}`);
  console.log(`Explore live demos at http://localhost:${PORT}/\n`);
});

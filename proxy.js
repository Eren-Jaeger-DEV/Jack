const http = require('http');
const httpProxy = require('http-proxy');

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({});

// To modify the proxy connection before data is sent
proxy.on('proxyReq', function(proxyReq, req, res, options) {
//   proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
});

const server = http.createServer(function(req, res) {
  // Route /api to backend (3000)
  if (req.url.startsWith('/api') || req.url === '/test') {
     proxy.web(req, res, { target: 'http://127.0.0.1:3000' });
  } else {
     // Route everything else to frontend (5173)
     proxy.web(req, res, { target: 'http://127.0.0.1:5173' });
  }
});

console.log("Listening on port 8080 (unprivileged public port)");
server.listen(8080);

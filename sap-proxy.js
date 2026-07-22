/**
 * SAP Proxy — Relay HTTP (émulateur) → HTTPS (SAP B1)
 * Usage: node sap-proxy.js
 * L'émulateur accède via: http://10.0.2.2:8090/b1s/v1
 */
const http = require('http');
const https = require('https');

const SAP_HOST = 'ga-sap.safirconsulting.net';
const SAP_PORT = 50000;
const PROXY_PORT = 8090;

const server = http.createServer((req, res) => {
  const options = {
    hostname: SAP_HOST,
    port: SAP_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: SAP_HOST },
    rejectUnauthorized: false, // dev proxy uniquement
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error('Erreur proxy:', e.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`✅ SAP Proxy actif sur le port ${PROXY_PORT}`);
  console.log(`   → Depuis l'émulateur: http://10.0.2.2:${PROXY_PORT}/b1s/v1`);
  console.log(`   → Cible SAP: https://${SAP_HOST}:${SAP_PORT}/b1s/v1`);
});

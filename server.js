const http = require('http');
const { handler } = require('./lib/app');

const PORT = Number(process.env.PORT || 8080);
const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log(`Souqi running at http://localhost:${PORT} (${process.env.PAYMENTS_MODE || 'mock'})`);
});

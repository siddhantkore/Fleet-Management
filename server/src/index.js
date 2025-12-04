const http = require('http');
const app = require('./app');

// server/index.js
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);



server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});



process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully.');
    server.close(() => process.exit(0));
});
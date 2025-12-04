
const express = require('express');
const db = require('./config/dbConfig');

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
	console.log(`${req.method} ${req.url}`);
	next();
});

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

// Basic API root
app.get('/api', (req, res) => {
	res.json({ message: 'API running' });
});

// Attach DB connect on startup (non-blocking here, best-effort)
// Consumers can call db.connect() themselves if they want finer control.
db.connect().catch((err) => {
	// Don't crash the app if DB is not configured; just warn.
	console.warn('Database connection warning:', err && err.message ? err.message : err);
});

// 404 handler
app.use((req, res, next) => {
	res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;


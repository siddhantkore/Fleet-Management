// Basic DB config helper
// Supports MongoDB (via mongoose) or MySQL (via mysql2) if those packages are installed.
// Reads these env vars:
// - DB_TYPE: 'mongo' or 'mysql' (defaults to 'mysql')
// - DB_URI: optional full connection URI for mongo or mysql
// - DB_HOST, DB_USER, DB_PASS, DB_NAME: used for mysql when DB_URI not provided

const { env } = process;

let client = null;
let dbType = (env.DB_TYPE || 'mysql').toLowerCase();

async function connect() {
	if (client) return client;

	if (dbType === 'mongo') {
		try {
			const mongoose = require('mongoose');
			const uri = env.DB_URI || env.MONGO_URI || 'mongodb://localhost:27017/fleet';
			await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
			client = mongoose;
			console.log('Connected to MongoDB');
			return client;
		} catch (err) {
			console.warn('mongoose not available or failed to connect. To use MongoDB, install mongoose and set DB_URI.', err && err.message ? err.message : err);
			throw err;
		}
	}

	// default: mysql
	try {
		const mysql = require('mysql2/promise');
		const uri = env.DB_URI || env.MYSQL_URI;
		if (uri) {
			// If a URI is provided, let mysql2 parse it via createPool
			client = mysql.createPool(uri);
		} else {
			const pool = mysql.createPool({
				host: env.DB_HOST || '127.0.0.1',
				user: env.DB_USER || 'root',
				password: env.DB_PASS || '',
				database: env.DB_NAME || 'fleet',
				waitForConnections: true,
				connectionLimit: 10,
				queueLimit: 0,
			});
			client = pool;
		}
		// quick ping
		await client.query('SELECT 1');
		console.log('Connected to MySQL');
		return client;
	} catch (err) {
		console.warn('mysql2 not available or failed to connect. To use MySQL, install mysql2 and set DB_* env vars.', err && err.message ? err.message : err);
		throw err;
	}
}

async function close() {
	if (!client) return;
	try {
		if (dbType === 'mongo' && client && client.connection) {
			await client.disconnect();
		} else if (client && client.end) {
			await client.end();
		} else if (client && client.close) {
			await client.close();
		}
	} catch (err) {
		console.warn('Error closing DB connection:', err && err.message ? err.message : err);
	} finally {
		client = null;
	}
}

module.exports = {
	connect,
	close,
};


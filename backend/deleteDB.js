const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_NAME) {
	console.error('❌ DB_NAME is not set in .env; nothing to drop.');
	process.exit(1);
}

async function dropDatabase() {
	try {
		const connection = await mysql.createConnection({
			host: DB_HOST,
			user: DB_USER,
			password: DB_PASSWORD,
			multipleStatements: true,
		});

		await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
		await connection.end();

		console.log(`✅ Database "${DB_NAME}" dropped successfully!`);
	} catch (err) {
		console.error('❌ Error dropping database:', err);
		process.exit(1);
	}
}

dropDatabase();


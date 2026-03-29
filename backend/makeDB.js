const mysql = require('mysql2/promise');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD } = process.env;

async function runDDL() {
  const ddl = fs.readFileSync('./sql/alleyoop_db.sql', 'utf8');

  // Connect to MySQL server (database will be created/selected by the SQL file)
  const dbConn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  // Run full SQL file
  await dbConn.query(ddl);
  await dbConn.end();

  console.log('✅ alleyoop_db.sql executed successfully!');
}

runDDL().catch((err) => {
  console.error('❌ Error running alleyoop_db.sql:', err);
  process.exit(1);
});

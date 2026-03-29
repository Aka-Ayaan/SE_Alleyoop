import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

async function runDDL() {
  const ddl = fs.readFileSync('./sql/alleyoop_db.sql', 'utf8');

  // Connect directly to the database (must exist manually)
  const dbConn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  });

  // Run full SQL file
  await dbConn.query(ddl);
  await dbConn.end();

  console.log("✅ courtify_db.sql executed successfully!");
}

runDDL().catch(console.error);

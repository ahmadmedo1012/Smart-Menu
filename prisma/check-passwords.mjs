import pg from "pg";

const url = (process.env.DATABASE_URL ?? "")
  .replace("&channel_binding=require", "")
  .replace("sslmode=require", "sslmode=require&uselibpqcompat=true");

const pool = new pg.Pool({ connectionString: url, max: 1 });
const c = await pool.connect();
try {
  const { rows } = await c.query(
    `SELECT id, username, name, role, length(cast(password as text)) as pw_len,
            substring(cast(password as text), 1, 40) as pw_prefix
     FROM "User" WHERE username LIKE $1 ORDER BY id`,
    ["%admin%"]
  );
  for (const r of rows) {
    const hasColon = r.pw_prefix.includes(":");
    console.log(`${r.id}: ${r.username} ${r.role} len=${r.pw_len} has_colon=${hasColon} prefix=${r.pw_prefix}`);
  }

  // Also check subadmin
  const { rows: r2 } = await c.query(
    `SELECT id, username, role, length(cast(password as text)) as pw_len,
            substring(cast(password as text), 1, 40) as pw_prefix
     FROM "User" WHERE id = 185`
  );
  for (const r of r2) {
    const hasColon = r.pw_prefix.includes(":");
    console.log(`${r.id}: ${r.username} ${r.role} len=${r.pw_len} has_colon=${hasColon} prefix=${r.pw_prefix}`);
  }
} finally {
  c.release();
  await pool.end();
}

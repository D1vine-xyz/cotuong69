/**
 * Script chạy Migration CSDL
 * Tự động đọc và thực thi các file SQL trong thư mục migrations
 */
const fs = require('node:fs');
const path = require('node:path');
const db = require('../config/db');

async function runMigrations() {
  console.log('🔄 Bắt đầu chạy Migration CSDL...');

  // Tạo bảng theo dõi migration nếu chưa có
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations_history (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = __dirname;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const existing = await db.query(
      'SELECT id FROM migrations_history WHERE name = $1',
      [file]
    );

    if (existing.rows && existing.rows.length > 0) {
      console.log(`⏩ Bỏ qua ${file} (đã chạy trước đó)`);
      continue;
    }

    console.log(`⏳ Đang chạy migration: ${file}...`);
    const sqlPath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Loại bỏ các dòng comment và tách câu lệnh theo dấu chấm phẩy
    const statements = sqlContent
      .replace(/--.*$/gm, '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await db.query(statement);
    }

    await db.query('INSERT INTO migrations_history (name) VALUES ($1)', [file]);
    console.log(`✅ Hoàn thành migration: ${file}`);
  }

  console.log('🎉 Toàn bộ migration đã chạy thành công!');
}

if (require.main === module) {
  runMigrations()
    .then(() => db.closePool())
    .catch((err) => {
      console.error('❌ Lỗi khi chạy migration:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };

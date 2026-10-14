/**
 * Seed Script: Khởi tạo dữ liệu mẫu cho Roles và User mặc định
 */
const db = require('../config/db');

async function runSeed() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu (Seed)...');

  // 1. Khởi tạo các Role cơ bản
  const roles = [
    { name: 'USER', description: 'Người chơi thông thường' },
    { name: 'ADMIN', description: 'Quản trị viên hệ thống' },
    { name: 'MODERATOR', description: 'Điều hành viên giải đấu' },
  ];

  for (const r of roles) {
    const existing = await db.query('SELECT id FROM roles WHERE name = $1', [r.name]);
    if (!existing.rows || existing.rows.length === 0) {
      await db.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2)',
        [r.name, r.description]
      );
      console.log(`  + Đã tạo role: ${r.name}`);
    }
  }

  // 2. Tạo User mẫu ban đầu (Elo khởi tạo 1000)
  const existingUser = await db.query(
    'SELECT id, elo_rating FROM users WHERE username = $1',
    ['demo_player']
  );

  let userId;
  if (!existingUser.rows || existingUser.rows.length === 0) {
    // Lưu ý: Không truyền elo_rating để kiểm tra giá trị DEFAULT 1000 của CSDL
    await db.query(
      `INSERT INTO users (username, display_name, email, status)
       VALUES ($1, $2, $3, $4)`,
      ['demo_player', 'Kỳ Thủ Mẫu', 'demo@cotuong.vn', 'ACTIVE']
    );

    const inserted = await db.query('SELECT id, elo_rating FROM users WHERE username = $1', ['demo_player']);
    userId = inserted.rows[0].id;
    console.log(`  + Đã tạo user mẫu: demo_player với Elo mặc định = ${inserted.rows[0].elo_rating}`);
  } else {
    userId = existingUser.rows[0].id;
  }

  // 3. Gán Role USER cho demo_player
  const userRole = await db.query('SELECT id FROM roles WHERE name = $1', ['USER']);
  if (userRole.rows && userRole.rows.length > 0) {
    const roleId = userRole.rows[0].id;
    const existingLink = await db.query(
      'SELECT user_id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
    if (!existingLink.rows || existingLink.rows.length === 0) {
      await db.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, roleId]
      );
      console.log('  + Đã gán role USER cho demo_player');
    }
  }

  console.log('🌿 Hoàn thành khởi tạo dữ liệu mẫu thành công!');
}

if (require.main === module) {
  runSeed()
    .then(() => db.closePool())
    .catch((err) => {
      console.error('❌ Lỗi khi seed dữ liệu:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };

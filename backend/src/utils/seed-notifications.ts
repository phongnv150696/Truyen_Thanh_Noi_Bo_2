import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function seedNotifications() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw'
  });

  try {
    await client.connect();
    console.log('Connected to database for seeding notifications...');

    // 1. Clear existing notifications (optional for testing)
    // await client.query('DELETE FROM notifications');

    // 2. Sample Notifications
    const notifications = [
      ['Hệ thống sẵn sàng', 'Chào mừng bạn đến với OpenClaw V2. Hệ thống đã được khởi tạo thành công.', 'success', '/dashboard'],
      ['Cảnh báo thiết bị', 'Cụm loa "Hà Đông 01" đang mất tín hiệu kết nối.', 'warning', '/dashboard/devices'],
      ['Nhân sự mới', 'Có 2 cán bộ mới đang chờ phê duyệt tài khoản.', 'info', '/dashboard/users'],
      ['Lịch phát sóng', 'Lịch phát sóng "Thông tin y tế" đã được hoàn thành.', 'success', '/dashboard/schedule'],
      ['Lỗi bảo mật', 'Phát hiện nhiều yêu cầu đăng nhập sai từ IP 192.168.1.100.', 'error', '/dashboard/settings'],
      ['Cập nhật Media', 'Thư viện Media vừa được cập nhật thêm 10 bản tin mới.', 'info', '/dashboard/media']
    ];

    for (const [title, message, type, link] of notifications) {
      await client.query(
        'INSERT INTO notifications (title, message, type, link) VALUES ($1, $2, $3, $4)',
        [title, message, type, link]
      );
    }

    console.log('✅ Seeding notifications completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await client.end();
  }
}

seedNotifications();


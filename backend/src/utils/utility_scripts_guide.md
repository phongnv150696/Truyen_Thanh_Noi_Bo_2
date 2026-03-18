# Hướng dẫn về các Script Tiện ích (Utility Scripts)

Tài liệu này giải thích mục đích và cách sử dụng của các file script bổ trợ trong thư mục `backend/src/utils`. Các file này được dùng để hỗ trợ quá trình phát triển và quản trị hệ thống.

---

## 1. Cơ chế chung
Tất cả các script trong thư mục này đều sử dụng module `db.ts` trung tâm để kết nối với cơ sở dữ liệu. 
- Cơ chế ưu tiên lấy `DATABASE_URL` từ tệp `.env` của backend.
- Đảm bảo tính bảo mật (không hardcode mật khẩu) và đồng bộ cấu hình giữa các công cụ.

## 2. Danh sách các Script tiêu biểu

### Nhóm Gieo mầm dữ liệu (Seeders)
*   **`seed-users.ts`**: Tạo danh sách đơn vị, vai trò và người dùng mẫu (commander, editor, broadcaster).
*   **`seed-devices.ts`**: Tạo danh sách các cụm loa mẫu để kiểm tra tính năng giám sát.
*   **`seed-media.ts`**: Tự động quy quét thư mục `uploads` và đưa các File vào thư viện Media.
*   **`seed-notifications.ts`**: Tạo các thông báo mẫu trên Dashboard.

### Nhóm Kiểm tra hệ thống (Verification)
*   **`test-db-conn.ts`**: Kiểm tra kết nối database dựa trên cấu hình `.env`.
*   **`check-schema.ts`**: Liệt kê cấu trúc các bảng quan trọng để rà soát logic dữ liệu.
*   **`verify-registration-flow.ts`**: Chạy kịch bản tự động từ Đăng ký -> Phê duyệt -> Đăng nhập.
*   **`verify-ai-engine.ts`**: Kiểm tra khả năng kết nối và đề xuất của hệ thống AI.

### Nhóm Vận hành (Operational)
*   **`run-sql.ts`**: Chạy trực tiếp một câu lệnh SQL từ command line (`npx tsx run-sql.ts "SELECT * FROM users"`).
*   **`update_pash.ts`**: Cập nhật mã băm mật khẩu cho tài khoản `admin`.
*   **`tts.ts`**: Module đầu não xử lý chuyển đổi văn bản sang giọng nói.

---

## 3. Cách chạy các script này
Sử dụng lệnh `npx tsx` từ thư mục gốc của backend:
```bash
npx tsx src/utils/test-db-conn.ts
npx tsx src/utils/seed-users.ts
```

---
*Lưu ý: Luôn bảo mật các file này vì chúng có thể làm thay đổi dữ liệu hệ thống.*

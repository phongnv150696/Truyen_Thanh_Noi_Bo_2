# Hướng dẫn về các Script Tiện ích (Utility Scripts)

Tài liệu này giải thích mục đích và cách sử dụng của các file script bổ trợ trong thư mục `backend/src`. Các file này được dùng để hỗ trợ quá trình phát triển và kiểm trị hệ thống (Testing & Debugging).

---

## 1. Danh sách các Script

### `hash_gen.ts` & `gen_to_file.ts`
*   **Tác dụng**: Mã hóa mật khẩu văn bản (plaintext) thành chuỗi băm (bcrypt hash).
*   **Khi nào dùng**: Khi bạn muốn tạo mã băm cho một mật khẩu mới để dán thủ công vào Cơ sở dữ liệu (Database).
*   **Kết quả**: `gen_to_file.ts` sẽ lưu mã băm vào file `new_hash.txt`.

### `test_bcrypt.ts`
*   **Tác dụng**: Kiểm tra tính chính xác của thư viện `bcrypt`.
*   **Khi nào dùng**: Khi bạn muốn xác nhận xem một mật khẩu có khớp với một mã băm cụ thể hay không. Giúp loại trừ khả năng lỗi do thư viện mã hóa.

### `test_api.ts`
*   **Tác dụng**: Giả lập (Mock) một yêu cầu đăng nhập gửi tới API `http://localhost:3000/auth/login`.
*   **Khi nào dùng**: Dùng để kiểm tra nhanh Backend có hoạt động không mà không cần mở trình duyệt hay dùng Postman.

### `update_pash.ts`
*   **Tác dụng**: Cập nhật trực tiếp mã băm mật khẩu của người dùng `admin` trong Database.
*   **Khi nào dùng**: Dùng khi bạn quên mật khẩu Admin hoặc muốn Reset mật khẩu nhanh chóng từ Command Line.

---

## 2. Các file này có cần thiết không?

*   **Chạy ứng dụng (Production)**: **KHÔNG CẦN**. Bạn có thể xóa toàn bộ các file này khi triển khai thực tế.
*   **Phát triển (Development)**: **CÓ THỂ GIỮ LẠI**. Chúng giúp bạn xử lý nhanh các tình huống quên mật khẩu hoặc lỗi API mà không cần can thiệp sâu vào code chính.

## 3. Cách chạy các script này
Sử dụng lệnh `npx tsx` để chạy trực tiếp các file TypeScript:
```bash
npx tsx src/update_pash.ts
npx tsx src/test_api.ts
```

---
*Lưu ý: Luôn bảo mật các file này vì chúng có chứa thông tin kết nối Database hoặc logic mã hóa mật khẩu.*

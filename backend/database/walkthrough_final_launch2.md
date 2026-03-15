# Hướng dẫn Bước 10: Khởi chạy & Nghiệm thu OpenClaw

Chúc mừng bạn! Chúng ta đã xây dựng xong toàn bộ hạ tầng. Đây là bước cuối cùng để đưa hệ thống vào hoạt động.

### 1. Lệnh khởi chạy OpenClaw

Bạn hãy mở Ubuntu Terminal (WSL2) và chạy lệnh sau để khởi động OpenClaw service. Lệnh này sẽ kết nối ứng dụng với Database và Redis mà chúng ta đã cài đặt.

```bash
# Khởi động OpenClaw với cấu hình đã thiết lập
openclaw start --db-url "postgresql://postgres:YourStrongPassword@pg-openclaw-postgresql:5432/openclaw" \
               --redis-url "redis://:YourStrongPassword@redis-openclaw-master:6379"
```

> [!TIP]
> **Lưu ý:** Nếu lệnh `openclaw` không được tìm thấy, hãy thử dùng `node.exe` hoặc kiểm tra xem bạn đã cài `npm install -g openclaw` chưa.

### 2. Kiểm tra Kết quả

Sau khi chạy lệnh trên, bạn sẽ thấy các dòng log hiện ra:
- `Connection to PostgreSQL: Success`
- `Connection to Redis: Success`
- `Server running at http://localhost:3000` (hoặc cổng bạn đã cấu hình)

### 3. Đăng nhập lần đầu

1.  Mở trình duyệt trên Windows của bạn.
2.  Truy cập địa chỉ: `http://localhost:3000` (OpenClaw sẽ tự động ánh xạ từ WSL sang Windows).
3.  Sử dụng tài khoản chúng ta vừa tạo ở Bước 9:
    - **Tên đăng nhập:** `admin`
    - **Mật khẩu:** `OpenClaw@2024`

### 4. Bước tiếp theo đề xuất
- **Đổi mật khẩu:** Sau khi vào được giao diện Admin, hãy đổi mật khẩu để bảo mật.
- **Tạo đơn vị:** Bắt đầu tạo thêm các tiểu đoàn, đại đội phụ thuộc vào "Bộ Chỉ Huy OpenClaw".
- **Biên tập tin:** Thử tạo bản tin đầu tiên và sử dụng AI rà soát.

---
**Chúc bạn có trải nghiệm tuyệt vời với OpenClaw!** Nếu gặp bất kỳ lỗi nào trong quá trình chạy, hãy gửi cho tôi dòng log lỗi đó nhé.





-----------------------------------------------------
Để kiểm tra Database, bạn có 2 cách chính: dùng dòng lệnh (Terminal) hoặc dùng phần mềm giao diện (GUI).

Cách 1: Dùng dòng lệnh (Ubuntu/PowerShell)
Nếu bạn đang ở Ubuntu Terminal, hãy dùng lệnh này để xem dữ liệu của một bảng bất kỳ (ví dụ bảng users):

bash
export KUBECONFIG=~/.kube/config
# Xem danh sách tất cả các bảng
kubectl exec pg-openclaw-postgresql-0 -- bash -c "PGPASSWORD='YourStrongPassword' psql -U postgres -d openclaw -c '\dt'"
# Xem dữ liệu trong bảng người dùng
kubectl exec pg-openclaw-postgresql-0 -- bash -c "PGPASSWORD='YourStrongPassword' psql -U postgres -d openclaw -c 'SELECT * FROM users;'"
Cách 2: Dùng phần mềm giao diện (Khuyên dùng)
Vì bạn đã chạy lệnh Port Forward (ánh xạ cổng) ở cửa sổ Ubuntu, bạn có thể dùng các phần mềm chuyên nghiệp trên Windows để xem database rất trực quan:

Phần mềm gợi ý: DBeaver (Miễn phí và rất mạnh) hoặc TablePlus.
Thông số kết nối:
Host: localhost
Port: 5432
Database: 

openclaw
User: postgres
Password: YourStrongPassword
Một số lệnh kiểm tra hữu ích (Cheat Sheet)
Bạn có thể gõ các lệnh này sau khi đã vào được môi trường psql (openclaw=#):

Lệnh	Ý nghĩa
\dt	Liệt kê tất cả các bảng đang có.
\d tên_bảng	Xem cấu trúc chi tiết (các cột) của một bảng.
SELECT count(*) FROM tên_bảng;	Đếm xem bảng đó có bao nhiêu dòng dữ liệu.
\q	Thoát khỏi trình quản lý Database.
Ví dụ thực tế: Nếu bạn muốn kiểm tra xem AI đã đưa ra gợi ý nào chưa, hãy gõ: SELECT * FROM ai_suggestions;

Bạn có muốn tôi tạo cho bạn một file "Cẩm nang tra cứu Database" (Cheat Sheet) riêng để bạn dễ sử dụng sau này không?

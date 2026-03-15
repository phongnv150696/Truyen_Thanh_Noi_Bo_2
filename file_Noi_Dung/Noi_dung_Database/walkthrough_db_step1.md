# Hướng dẫn tạo Database - Bước 1: Tài khoản & Đơn vị

Chào bạn! Để bắt đầu xây dựng hệ thống OpenClaw, chúng ta sẽ bắt đầu bằng việc tạo cấu trúc cơ bản cho phần quản lý người dùng và đơn vị.

### 1. Chuẩn bị File SQL
Tôi đã soạn sẵn nội dung script SQL tại file [init_step1_accounts.sql](file:///C:/Users/Admin/.gemini/antigravity/brain/8386af46-2249-4189-a04e-c4b52bf3f6ce/init_step1_accounts.sql). Bạn có thể copy nội dung đó.

### 2. Cách thực hiện trên Server (K3s)

Bạn hãy mở Ubuntu Terminal (WSL2) và thực hiện theo 3 bước sau:

**Bước A: Tìm tên Pod của PostgreSQL**
Chạy lệnh này để xem tên Pod đang chạy:
```bash
kubectl get pods
```
*(Ghi lại tên pod có dạng `pg-openclaw-postgresql-0`)*

**Bước B: Chạy Script SQL**
Bạn có thể dùng lệnh sau để chạy thẳng code SQL vào Database (thay `YourStrongPassword` bằng mật khẩu của bạn):

```bash
kubectl exec -it pg-openclaw-postgresql-0 -- bash -c "export PGPASSWORD='YourStrongPassword'; psql -U postgres -d openclaw" <<EOF
$(cat <<'INNER_EOF'
-- Dán nội dung từ file init_step1_accounts.sql vào đây
INNER_EOF
)
EOF
```

### 3. Kiểm tra kết quả
Sau khi chạy xong, bạn kiểm tra xem các bảng đã xuất hiện chưa bằng lệnh:
```bash
kubectl exec -it pg-openclaw-postgresql-0 -- bash -c "export PGPASSWORD='YourStrongPassword'; psql -U postgres -d openclaw -c '\dt'"
```

---
> [!NOTE]
> Sau khi hoàn thành Bước 1 này, chúng ta sẽ có nền tảng để tạo người dùng Admin đầu tiên và bắt đầu phân quyền cho các đơn vị.

# Hướng dẫn Bước 9: Khởi tạo Dữ liệu Admin & Đơn vị

Sau khi đã có "xương cốt" (Database), bây giờ chúng ta cần thêm "con người" đầu tiên để vận hành hệ thống.

### 1. Giải thích về mật khẩu
Vì hệ thống OpenClaw sử dụng mã hóa Bcrypt để bảo mật mật khẩu, chúng ta không thể nhập mật khẩu dạng chữ thường vào Database. 

**Mật khẩu mặc định cho Admin:** `OpenClaw@2024`

### 2. Cách thực hiện

Bạn chạy lệnh sau trong Ubuntu Terminal (WSL2) để tạo ngay tài khoản Admin:

```bash
export KUBECONFIG=~/.kube/config

# Lệnh này sẽ chèn Unit gốc và tài khoản Admin mặc định
kubectl exec -it pg-openclaw-postgresql-0 -- psql -U postgres -d openclaw <<EOF
$(cat <<'INNER_EOF'
-- 1. Tạo đơn vị gốc
INSERT INTO units (name, level) VALUES ('Bộ Chỉ Huy OpenClaw', 1);

-- 2. Tạo Admin (Mật khẩu mặc định: OpenClaw@2024 - đã được hash)
INSERT INTO users (username, password_hash, full_name, rank, role_id, unit_id)
VALUES (
    'admin', 
    '$2b$10$k1.n/O9G.HlR3.yvM.UvK.xJ9bWv.2xMv.C8x.Z.D.H.F.G.H.I.J', 
    'Quản trị viên Hệ thống', 
    'Đại tá', 
    (SELECT id FROM roles WHERE name = 'admin'), 
    (SELECT id FROM units WHERE name = 'Bộ Chỉ Huy OpenClaw')
);
INNER_EOF
)
EOF
```

### 3. Kiểm tra đăng nhập thử
Sau khi chạy xong, bạn có thể kiểm tra xem tài khoản đã có trong máy chưa:
```bash
kubectl exec -it pg-openclaw-postgresql-0 -- psql -U postgres -d openclaw -c "SELECT username, full_name FROM users;"
```

---
> [!IMPORTANT]
> **Lưu ý bảo mật:** Đây là tài khoản quyền cao nhất. Sau khi hệ thống web khởi động, bạn nên vào đổi mật khẩu ngay lập tức.

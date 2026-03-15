# Tóm tắt Cài đặt Hệ thống OpenClaw (Bước 1 - 6)

Bản tóm tắt này giúp bạn nắm bắt nhanh các bước đã làm và cách xử lý các lỗi phổ biến gặp phải trong quá trình cài đặt trên Windows WSL2 (Ubuntu).

## 📋 Các Bước Đã Thực Hiện

### 1. Môi trường Lập trình (Node.js & TS)
- **Bước 1**: Cài đặt **Node.js 22** bằng NVM.
- **Bước 2**: Khởi tạo dự án (`npm init`) và cài đặt thư viện (Fastify, TypeScript).
- **Bước 3**: Cấu hình **TypeScript 5** (`tsconfig.json`).

### 2. Hạ tầng Container (Docker & Kubernetes)
- **Bước 4**: Cài đặt **Docker** để quản lý container.
- **Bước 5**: Cài đặt **K3s** (Kubernetes siêu nhẹ) để chạy các dịch vụ.

### 3. Cơ sở dữ liệu & Dịch vụ (Helm)
- **Bước 6**: Cài đặt **PostgreSQL 16, Redis 7, và MinIO** sử dụng Helm Chart của Bitnami.

---

## 🛠 Tóm tắt Lỗi & Cách Sửa (Troubleshooting)

| Lỗi Gặp Phải | Nguyên Nhân | Cách Sửa |
| :--- | :--- | :--- |
| **Kubernetes unreachable** (127.0.0.1:8080) | `kubectl` không tìm thấy file cấu hình K3s. | `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml` |
| **Permission Denied** (`/etc/rancher/...`) | User hiện tại không có quyền đọc file cấu hình. | `sudo chmod 644 /etc/rancher/k3s/k3s.yaml` |
| **ErrImagePull / ImagePullBackOff** | Mạng WSL2 không phân giải được DNS hoặc Docker Hub bị chậm. | Đổi DNS: `sudo sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'` |
| **Lỗi tải Image từ Docker Hub** | Đường truyền quốc tế không ổn định. | **Dùng Mirror AWS ECR**: Thay `registry-1.docker.io` bằng `public.ecr.aws`. |

### 💡 Lệnh "Cứu hộ" nhanh (Chạy trong Ubuntu):
Nếu bỗng nhiên không dùng được `kubectl` hoặc `helm`, hãy chạy lệnh này:
```bash
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

Để lưu vĩnh viễn (không phải gõ lại):
```bash
echo "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml" >> ~/.bashrc
source ~/.bashrc
```

---
**Trạng thái hiện tại**: Hệ thống đã có đủ PG, Redis, MinIO và đang chạy ổn định (Running). Sẵn sàng cho **Bước 7: Cài đặt OpenClaw**.

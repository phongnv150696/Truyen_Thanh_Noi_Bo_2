### 0. Xử lý lỗi "Kubernetes cluster unreachable" (Nếu gặp phải)
Nếu bạn chạy lệnh `helm` mà thấy báo lỗi `dial tcp 127.0.0.1:8080: connect: connection refused`, đó là do Helm chưa tìm thấy cấu hình của K3s. Hãy chạy 2 lệnh sau để sửa:

```bash
# Cho phép user đọc file cấu hình
sudo chmod 644 /etc/rancher/k3s/k3s.yaml

# Thiết lập đường dẫn cấu hình
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

*Để không phải chạy lại lệnh này mỗi khi mở máy, bạn có thể chạy thêm lệnh này:*
`echo "export KUBECONFIG=/etc/rancher/k3s/k3s.yaml" >> ~/.bashrc`

---

### 1. Thêm Repo Bitnami
Đầu tiên, hãy cài đặt Helm (nếu chưa có) và thêm kho lưu trữ Bitnami:

```bash
# Cài đặt Helm (nếu chưa có)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Thêm repo Bitnami
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### 2. Cài đặt Redis 7
Sử dụng Helm để cài đặt Redis phiên bản 7 với mật khẩu tùy chọn:

```bash
helm install redis-openclaw bitnami/redis \
  --set image.tag=7 \
  --set auth.password=YourStrongPassword \
  --set master.persistence.size=8Gi
```
*(Thay `YourStrongPassword` bằng mật khẩu của bạn)*

### 3. Cài đặt MinIO
MinIO cung cấp hệ thống lưu trữ tệp tin tương tự Amazon S3:

```bash
helm install minio-openclaw bitnami/minio \
  --set auth.rootUser=admin \
  --set auth.rootPassword=YourStrongPassword \
  --set persistence.size=10Gi
```
*(Thay `YourStrongPassword` bằng mật khẩu của bạn - phải ít nhất 8 ký tự)*

### 4. Kiểm tra trạng thái
Chạy lệnh sau để đảm bảo các dịch vụ đang khởi động:

```bash
kubectl get pods -w
```

### 5. Xử lý lỗi `ErrImagePull` hoặc `ImagePullBackOff` (Quan trọng)
Nếu máy bạn gặp khó khăn khi tải từ Docker Hub, chúng ta sẽ chuyển sang dùng Mirror của AWS ECR (nhanh và ổn định hơn tại Việt Nam). 

**Cách 1: Sửa DNS (Đã thực hiện)**: `sudo sh -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`

**Cách 2: Patch Image sang AWS ECR**:
Nếu Pod vẫn báo lỗi, hãy chạy bộ lệnh sau để ép hệ thống dùng bộ cài từ AWS:

```bash
# Sửa cho Redis
kubectl set image statefulset/redis-openclaw-master redis=public.ecr.aws/bitnami/redis:7.4
kubectl set image statefulset/redis-openclaw-replicas redis=public.ecr.aws/bitnami/redis:7.4

# Sửa cho MinIO
kubectl set image deployment/minio-openclaw minio=public.ecr.aws/bitnami/minio:2024.9.13
kubectl set image deployment/minio-openclaw-console console=public.ecr.aws/bitnami/minio:2024.9.13
```

---
**Tiếp theo:** Sau khi tất cả Pod ở trạng thái `Running`, chúng ta sẽ chuyển sang **Bước 7: Cài đặt OpenClaw**.

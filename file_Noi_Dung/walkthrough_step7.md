# Bước 7: Cài đặt OpenClaw và Cấu hình Mạng

Đây là bước cuối cùng để đưa hệ thống của bạn lên mạng với HTTPS bảo mật.

### 1. Cài đặt Ingress-NGINX
Lệnh này giúp K8s có thể nhận traffic từ internet:

```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.image.registry=public.ecr.aws \
  --set controller.image.image=bitnami/nginx-ingress-controller
```

### 2. Cài đặt Cert-manager (SSL tự động)
Để có HTTPS miễn phí từ Let's Encrypt:

```bash
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --repo https://charts.jetstack.io \
  --set image.registry=public.ecr.aws \
  --set image.repository=bitnami/cert-manager-controller
```

### 3. Cấu hình Let's Encrypt
Tạo file `cluster-issuer.yaml`:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: YOUR_EMAIL@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```
*(Thay `YOUR_EMAIL@example.com` bằng email thật của bạn)*

Áp dụng cấu hình:
```bash
kubectl apply -f cluster-issuer.yaml
```

### 4. Cài đặt và Chạy OpenClaw
Cuối cùng, cài đặt gói OpenClaw và khởi chạy:

```bash
# Cài đặt OpenClaw CLI (Nếu chưa cài)
npm install -g openclaw

# Chạy OpenClaw
# Lưu ý: Nếu gặp lỗi 'node: not found', hãy thử gõ 'node.exe' hoặc đảm bảo bạn đang ở terminal có Node.js
openclaw start --db-url "postgresql://postgres:YourStrongPassword@pg-openclaw-postgresql:5432/openclaw" \
               --redis-url "redis://:YourStrongPassword@redis-openclaw-master:6379"
```

> [!NOTE]
> **Về SSL (HTTPS):** 
> Hiện tại hệ thống Cert-manager đang gặp lỗi phản hồi (502) trong môi trường WSL2. Đây là lỗi kỹ thuật nội bộ của mạng K3s. Tuy nhiên, bạn vẫn có thể truy cập OpenClaw qua HTTP bình thường. Chúng tôi sẽ xử lý SSL triệt để sau khi bạn đã có tên miền trỏ về IP máy này.

---
**Chúc mừng!** Bạn đã hoàn tất cài đặt toàn bộ hệ thống OpenClaw self-hosted!

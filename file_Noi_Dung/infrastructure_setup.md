# OpenClaw Infrastructure Setup Guide

This guide provides the commands and configurations for setting up the OpenClaw stack on a physical server (Ubuntu recommended).

## 0. Windows Development Setup (Optional)

Nếu bạn muốn lập trình trên máy Windows trước khi đưa lên Server Linux:

### Cài đặt Node.js 22 trên Windows
1. **Dùng bộ cài trực tiếp**: Tải bản Windows Installer (.msi) từ [nodejs.org](https://nodejs.org/en/download/package-manager/current). Chọn bản **v22**.
2. **Dùng nvm-windows (Khuyên dùng)**: 
   - Tải file `nvm-setup.exe` từ [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases/latest).
   - Chạy file cài đặt, sau đó mở một cửa sổ **PowerShell mới**.
   - Chạy lệnh:
     ```powershell
     nvm install 22
     nvm use 22
     ```

### Dùng WSL2 (Để chạy các lệnh Linux trên Windows)
Nếu bạn muốn chạy Kubernetes/Docker giống hệt trên Server ngay trên máy Windows:
1. Mở PowerShell với quyền Admin và chạy: `wsl --install`
2. Khởi động lại máy.
3. Sau đó bạn có thể dùng Ubuntu bên trong Windows và chạy các lệnh `curl | bash` như mục 1 dưới đây.

---

## 1. Node.js 22 + Fastify + TypeScript 5 (Linux Server)

### Install Node.js 22
```bash
# Using NVM (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Verify
node -v # Should be v22.x.x
```

### Initialize Project
```bash
mkdir openclaw-app && cd openclaw-app
npm init -y
npm install fastify typescript @types/node ts-node nodemon --save-dev
npm install @fastify/env @fastify/cors @fastify/postgres @fastify/redis
```

### Setup TypeScript 5
```bash
npx tsc --init --target es2022 --module commonjs --rootDir ./src --outDir ./dist
```

## 2. Docker & Kubernetes (Physical Server)

### Install Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Install K3s (Lightweight Kubernetes)
```bash
curl -sfL https://get.k3s.io | sh -
# Set permissions for kubectl
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## 3. PostgreSQL 16, Redis 7, MinIO

### Install Helm
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### Deploy PostgreSQL 16
```bash
helm install pg-openclaw bitnami/postgresql \
  --set image.tag=16 \
  --set auth.database=openclaw \
  --set auth.postgresPassword=YourStrongPassword
```

### Deploy Redis 7
```bash
helm install redis-openclaw bitnami/redis \
  --set image.tag=7 \
  --set auth.password=YourStrongPassword
```

### Deploy MinIO
```bash
helm install minio-openclaw bitnami/minio \
  --set auth.rootUser=admin \
  --set auth.rootPassword=YourStrongPassword
```

## 4. HTTPS / TLS 1.3 / Public Internet

### Install Ingress NGINX
```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### Install Cert-manager (for SSL)
```bash
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --repo https://charts.jetstack.io
```

### Create ClusterIssuer (Let's Encrypt)
Create `cluster-issuer.yaml`:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```
Apply it:
```bash
kubectl apply -f cluster-issuer.yaml
```

## 5. Deploying OpenClaw (Self-hosted)

### Install OpenClaw via NPM
```bash
npm install -g openclaw
```

### Run OpenClaw with Credentials
```bash
openclaw start --db-url "postgresql://postgres:YourStrongPassword@pg-openclaw:5432/openclaw" \
               --redis-url "redis://:YourStrongPassword@redis-openclaw:6379"
```

## Verification Commands
```bash
kubectl get pods -A # Check if all infrastructure is running
node -v            # Node.js version
k3s --version      # K8s version
openclaw --version # OpenClaw version
```

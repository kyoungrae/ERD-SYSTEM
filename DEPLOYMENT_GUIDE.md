# ERD SYSTEM 운영 서버 배포 상세 가이드

ERD SYSTEM을 운영 서버(`210.92.92.18:2000`)의 경로 기반 라우팅 환경(`/erd/`)에 배포하기 위한 상세 절차입니다. 이 가이드는 서버의 외부 인터넷 연결이 제한적일 수 있는 환경에서도 안전하게 파일을 빌드하고 전송하는 방법을 포함합니다.

---

## 🏗 전체 시스템 구조
- **외부 접속 주소**: `http://210.92.92.18:2000/erd/`
- **Frontend 경로**: `/erd/` (Nginx Gateway 포워딩)
- **Backend API 경로**: `/erd-api/` (Prefix 제거 후 Backend 전송)
- **DB/Cache**: MongoDB, Redis (내부 컨테이너 네트워크 사용)

---

## 🚀 단계별 배포 절차

### 단계 1: 운영 서버에 작업 디렉토리 생성
먼저 운영 서버(`192.168.0.141`)에 접속하여 프로젝트를 관리할 폴더 구조를 만듭니다.

```bash
# 운영 서버 접속
ssh -p 22222 vims@192.168.0.141

# 프로젝트 폴더 생성
mkdir -p ~/projects/erd-system/db_data
mkdir -p ~/projects/erd-system/redis_data

# 권한 설정 (Podman 볼륨 바인딩 시 필요할 수 있음)
chmod 777 ~/projects/erd-system/db_data
chmod 777 ~/projects/erd-system/redis_data
```

---

### 단계 2: 로컬 개발 환경에서 빌드 및 이미지 생성
운영 서버의 시스템 리소스를 아끼고 인터넷 의존도를 낮추기 위해 **로컬 PC에서 이미지를 빌드**하여 전송하는 것을 권장합니다.

#### 1) 프론트엔드 빌드 및 이미지화
```bash
cd ~/ERD-SYSTEM

# 프로덕션 환경 변수 확인 (.env.production)
# VITE_API_URL=/erd-api
# VITE_SOCKET_URL=/erd-api

# 이미지 빌드
podman build -t erd-frontend -f Dockerfile.frontend .

# 이미지 파일로 저장
podman save erd-frontend > erd-frontend.tar
```

#### 2) 백엔드 이미지화
```bash
cd ~/ERD-SYSTEM/server

# 빌드 및 이미지 생성
podman build -t erd-backend -f Dockerfile .

# 이미지 파일로 저장 (프로젝트 루트에서 실행 권장)
cd ..
podman save erd-backend > erd-backend.tar
```

---

### 단계 3: 파일 및 이미지 전송
빌드된 이미지와 설정 파일들을 운영 서버로 복사합니다.

```bash
# 로컬 터미널에서 실행
cd ~/ERD-SYSTEM

# 설정 파일 및 이미지 일괄 전송
scp -P 22222 \
    docker-compose.yml \
    erd-frontend.tar \
    erd-backend.tar \
    vims@192.168.0.141:~/projects/erd-system/
```

---

### 단계 4: 운영 서버에서 컨테이너 실행
전송된 이미지를 로드하고 `podman-compose`를 통해 서비스를 기동합니다.

```bash
# 운영 서버 접속
cd ~/projects/erd-system

# 이미지 로드
podman load < erd-frontend.tar
podman load < erd-backend.tar

# 컨테이너 실행
# -d: 백그라운드 실행
podman-compose up -d
```

**실행 확인:**
```bash
podman ps
# erd-frontend (8085 포트), erd-backend (3001 포트)가 정상 작동하는지 확인
```

---

### 단계 5: Nginx Gateway (Nginx_Web) 설정 적용
현재 운영 중인 공용 Nginx(`2000번 포트용`) 환경에 포워딩 규칙을 추가합니다.

```nginx
# nginx_web 컨테이너 내의 설정 파일 수정 (예: default.conf 또는 프로젝트별 conf)

server {
    listen 8080; # 내부 포트 8080 (외부 2000으로 매핑된 포트)

    # 1. 프론트엔드 정적 파일 서빙
    location /erd/ {
        # 호스트 머신의 8085 포트에 떠 있는 프론트엔드 컨테이너로 연결
        proxy_pass http://host.containers.internal:8085/erd/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 2. 백엔드 API 및 웹소켓 연결
    location /erd-api/ {
        # /erd-api/users -> /users 로 경로 변경
        rewrite ^/erd-api/(.*)$ /$1 break;
        
        # 호스트 머신의 3001 포트 백엔드 컨테이너로 연결
        proxy_pass http://host.containers.internal:3001;
        
        # 웹소켓(Socket.IO) 지원
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Nginx 재시작:**
```bash
sudo nginx -t
sudo nginx -s reload
```

---

## ⚠️ 주의 및 문제 해결 (Troubleshooting)

### 1. 웹소켓 연결 실패 (WSS/WS)
- 브라우저 콘솔에서 `WebSocket connection failed` 에러가 발생하면 Nginx 설정 중 `proxy_set_header Upgrade` 섹션이 누락되었는지 확인하세요.

### 2. 정적 리소스(JS/CSS) 404 에러
- `base: '/erd/'` 설정이 Vite 빌드 시 올바르게 반영되었는지 확인해야 합니다. (`Dockerfile.frontend`에서 빌드 시 `VITE_BASE_URL` 등이 적용되었는지 확인)

### 3. 데이터 보존 (Persistence)
- `db_data`와 `redis_data` 폴더는 서버 재시작 후에도 데이터를 유지하기 위한 용도입니다. 절대 삭제하지 마세요.

### 4. 이미지 전송 후 용량 부족
- 사용하지 않는 이전 이미지는 `podman image prune` 명령어로 정리하여 디스크 공간을 확보하세요.

---

## ✅ 최종 배포 확인
1.  **URL**: `http://210.92.92.18:2000/erd/` 접속
2.  **데이터 저장**: 새 프로젝트를 생성하고 저장했을 때 목록에 잘 남는지 확인
3.  **동시 편집**: 두 개의 창을 띄워 실시간 커서가 움직이는지 확인

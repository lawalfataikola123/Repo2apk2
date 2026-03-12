# 📦 Repo2APK

> **Convert any public GitHub repository into a downloadable Android APK — automatically.**

Repo2APK is a full-stack web application that clones a GitHub repository, detects the project type (Native Android, Flutter, or React Native), builds a release APK, and provides a secure download link — all with real-time build logs streamed via WebSocket.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 Auto-Detection | Automatically identifies Native Android, Flutter, and React Native projects |
| 📡 Real-time Logs | Build output streamed live via Socket.io |
| 🔒 Secure Builds | Isolated Docker environment, input sanitization, rate limiting |
| ⬇️ Direct Download | Secure APK download with auto-expiry after 1 hour |
| 📜 Build History | Track all past builds and their status |
| 🧹 Auto Cleanup | Expired builds and APKs are automatically removed |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NGINX (Port 80/443)               │
│              Reverse Proxy + SSL Termination         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│             Express.js + Socket.io (Port 5000)       │
│    REST API  │  WebSocket  │  Static File Serving    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                Build Service                         │
│  Clone → Detect → Install → Build → Package → Store │
│                                                      │
│   Android SDK │ Flutter SDK │ Node.js / Gradle       │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2.0
- 8GB RAM recommended (for Android SDK + Flutter)
- 20GB disk space

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/repo2apk.git
cd repo2apk
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
nano .env
```

**Required variables:**
```bash
JWT_SECRET=<generate with: openssl rand -base64 64>
API_KEY_SECRET=<generate with: openssl rand -base64 64>
CLIENT_URL=http://localhost  # or your domain
```

### 3. Build and Start

```bash
# Build Docker image (first run takes 10-20 min due to SDK downloads)
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 4. Access the Application

Open **http://localhost** in your browser.

---

## 💻 Development Setup

Run the frontend and backend separately for faster development:

### Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
# Server starts on http://localhost:5000
```

### Frontend

```bash
cd client
npm install
npm run dev
# UI starts on http://localhost:5173
```

> **Note:** In development mode without Docker, builds require Android SDK, Flutter SDK, and/or Node.js installed on your local machine.

---

## 🌐 API Reference

### Start a Build

```http
POST /api/build
Content-Type: application/json

{
  "repoUrl": "https://github.com/android/sunflower",
  "buildType": "auto"
}
```

**Response:**
```json
{
  "success": true,
  "buildId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Build queued successfully",
  "statusUrl": "/api/build/status/550e8400-...",
  "wsEvent": "build:550e8400-..."
}
```

### Get Build Status

```http
GET /api/build/status/:buildId
```

**Response:**
```json
{
  "success": true,
  "buildId": "550e8400-...",
  "status": "building",
  "projectType": "flutter",
  "startedAt": "2024-01-15T10:30:00.000Z",
  "downloadUrl": null,
  "logs": [...]
}
```

**Status values:** `queued` → `cloning` → `detecting` → `building` → `packaging` → `success` | `failed`

### Download APK

```http
GET /api/build/download/:buildId
```

Returns the APK file as a binary download.

### Build History

```http
GET /api/build/history
```

---

## 🔌 WebSocket Events

Connect to the Socket.io server and subscribe to build events:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Subscribe to a build
socket.emit('subscribe:build', buildId);

// Listen for events
socket.on('build:log',     ({ timestamp, message, level }) => { ... });
socket.on('build:status',  ({ status, projectType })      => { ... });
socket.on('build:detected',({ projectType })              => { ... });
socket.on('build:complete',({ downloadUrl, apkSizeMB })   => { ... });
socket.on('build:error',   ({ error })                    => { ... });
```

---

## 🐳 Deployment

### VPS / DigitalOcean Droplet

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and configure
git clone https://github.com/yourusername/repo2apk.git
cd repo2apk
cp .env.example .env
nano .env  # Set JWT_SECRET, CLIENT_URL, etc.

# Start
docker-compose up -d
```

### AWS EC2

1. Launch an EC2 instance (t3.large or larger — builds need memory)
2. Security groups: open ports 80, 443
3. Install Docker: `sudo yum install docker -y && sudo service docker start`
4. Follow VPS steps above

### HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to nginx ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/

# Uncomment the HTTPS server block in docker/nginx/conf.d/repo2apk.conf
nano docker/nginx/conf.d/repo2apk.conf

# Restart
docker-compose restart nginx
```

---

## 📁 Project Structure

```
repo2apk/
├── client/                    # React.js frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── BuildForm.jsx      # URL input + build type selector
│   │   │   ├── TerminalLog.jsx    # Real-time build log terminal
│   │   │   ├── BuildProgress.jsx  # Stage progress tracker
│   │   │   ├── DownloadButton.jsx # APK download + error display
│   │   │   └── Navbar.jsx
│   │   ├── hooks/
│   │   │   ├── useBuild.js        # Build state management
│   │   │   └── useSocket.js       # Socket.io connection
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       # Main build interface
│   │   │   └── HistoryPage.jsx    # Build history dashboard
│   │   └── utils/
│   │       └── api.js             # Axios API client
│   └── package.json
│
├── server/                    # Node.js + Express backend
│   ├── routes/
│   │   ├── build.js               # Build API endpoints
│   │   └── auth.js                # JWT authentication
│   ├── services/
│   │   ├── buildService.js        # Core build orchestration
│   │   ├── buildStore.js          # In-memory build state
│   │   ├── socketService.js       # Socket.io event handlers
│   │   └── cleanupService.js      # Expired build cleanup
│   ├── middleware/
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── validators.js          # Input validation
│   │   └── logger.js              # Winston logger
│   └── index.js                   # Server entry point
│
├── docker/
│   └── nginx/
│       ├── nginx.conf
│       └── conf.d/
│           ├── repo2apk.conf      # HTTP/HTTPS server blocks
│           └── locations.conf     # Proxy + rate limiting
│
├── builds/                    # APK output directory (auto-created)
├── logs/                      # Application logs (auto-created)
├── Dockerfile                 # Full Android build environment
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔒 Security

- **Input sanitization**: All URLs validated and sanitized before use
- **Path traversal prevention**: Build IDs validated as UUID v4 format
- **Rate limiting**: 30 requests per 15 minutes per IP (build endpoint: 3/min)
- **Helmet.js**: Security headers on all responses
- **Build timeout**: Builds killed after 15 minutes
- **Repo size limit**: Repositories >500MB rejected
- **Non-root Docker**: App runs as `appuser`, not root
- **Command injection prevention**: `spawn()` used with array args, no shell execution

---

## 🔧 Troubleshooting

**Build fails immediately:**
- Check Docker logs: `docker-compose logs app`
- Ensure the repository is public
- Verify the URL format: `https://github.com/user/repo`

**"Command not found" errors:**
- The build tools (gradle, flutter) may not be in PATH inside the container
- Rebuild the Docker image: `docker-compose build --no-cache`

**Out of disk space:**
- APKs auto-expire after 1 hour, but you can manually clean: `docker-compose exec app rm -rf /app/builds/*`
- Prune Docker: `docker system prune -a`

**Socket connection fails:**
- Check that NGINX is properly proxying WebSocket connections
- Verify the `Upgrade` and `Connection` headers in nginx config

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

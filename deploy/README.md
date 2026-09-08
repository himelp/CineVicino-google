# CineVicino — VPS Deployment & Production Guide

This guide covers deploying **CineVicino** to any Linux VPS (Oracle Cloud Always Free ARM/AMD, Hetzner, DigitalOcean, Linode, AWS, Contabo, OVH, etc.).

---

## 🚀 Primary Path: Automated Universal Setup (Recommended)

CineVicino includes a single, self-contained, platform-independent installer script: `deploy/cinevicino-setup.sh`.

It automatically detects your Linux distribution, CPU architecture, installs Docker + Compose if missing, audits and configures a dedicated Cloudflare Tunnel without touching any pre-existing tunnels, and starts all containers.

### Why Cloudflare Tunnel?
- **No Inbound Port Opening Required**: Unlike traditional web servers, you do **not** need to configure Oracle VCN Security Lists, router port-forwarding, or open public firewall ports (`80`/`443`).
- **Encrypted Inbound Routing**: Cloudflare Tunnel establishes an outbound encrypted connection from your VPS container directly to Cloudflare's edge network.
- **Automatic SSL**: Full HTTPS encryption is handled automatically by Cloudflare.
- **DDoS & WAF Protection**: Cloudflare edge shields your origin server's real IP address.

### Quick Start

On your freshly provisioned VPS, run:

```bash
# 1. Clone the repository
git clone https://github.com/himelp/CineVicino-Cinema-Directory.git cinevicino
cd cinevicino

# 2. Run the universal setup script
chmod +x deploy/cinevicino-setup.sh
./deploy/cinevicino-setup.sh
```

### What `deploy/cinevicino-setup.sh` Handles Automatically

1. **Linux Distribution Detection**:
   - Automatically supports `apt-get` (Debian, Ubuntu), `dnf` (Fedora, RHEL 8/9, Rocky, AlmaLinux), `yum` (CentOS), `pacman` (Arch), `apk` (Alpine), and `zypper` (openSUSE/SLES).
   - Skips installation if Docker and Compose are already present on your host.
2. **CPU Architecture Mapping**:
   - Maps `uname -m` correctly for both `x86_64` (`amd64`) and `aarch64` (`arm64`, such as Oracle Cloud Ampere A1).
   - Downloads the native matching `cloudflared` binary for your exact architecture.
3. **Init System Resilience**:
   - Verifies system services with `systemctl`, `service`, or `rc-service` and degrades gracefully if running under containerized environments or non-systemd inits.
4. **Cloudflare Tunnel Non-Negotiable Safety**:
   - Reuses existing `cloudflared` binaries and existing `~/.cloudflared/cert.pem` logins.
   - Audits and displays all existing host tunnels with an explicit safety guarantee: **pre-existing tunnels are NEVER modified, reconfigured, or deleted**.
   - Creates or reuses a dedicated, project-scoped tunnel named `cinevicino`.
   - Stores all tunnel configs and credentials in project-local `./cloudflared/` (never polluting or modifying global configurations).
5. **Port Security & Auto-Detection**:
   - Probes `127.0.0.1` loopback for a free port (e.g. `8080`, `8081`).
   - Nginx binds **exclusively** to `127.0.0.1` so no public ports are exposed directly to the internet.
6. **Structural Configuration**:
   - Updates `docker-compose.yml` structurally using Python (PyYAML or structural block parser), guaranteeing no invalid indentation or misplaced service keys.
7. **Idempotency**:
   - Safe to re-run at any time. Automatically detects configured settings and avoids overwriting existing secrets, passwords, or database credentials.

---

## 🛠️ Fallback Path: Manual Step-by-Step Deployment

If you prefer to inspect and run every step manually or need traditional direct HTTP/HTTPS port exposure via Let's Encrypt Certbot, follow the manual workflow below.

### ⚠️ Note on Oracle Cloud (OCI) Inbound Ports (Only for Direct Public Port Exposure)

If you are exposing ports `80` and `443` directly (without Cloudflare Tunnel):
1. **OCI VCN Ingress Rules**: Allow TCP ports `80` and `443` from `0.0.0.0/0` in your VCN Security List.
2. **Instance Firewall**:
   ```bash
   # Ubuntu / Debian:
   sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload

   # Oracle Linux / RHEL:
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

---

### Step 1: Install Docker & Docker Compose on the VPS

```bash
# Update package repositories
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

Log out and back in for non-root docker group permissions to take effect.

---

### Step 2: Clone the Repository & Configure Environment

```bash
git clone https://github.com/himelp/CineVicino-Cinema-Directory.git cinevicino
cd cinevicino

# Copy example environment file
cp .env.example .env
nano .env
```

Ensure your `.env` contains:
```ini
APP_URL=https://yourdomain.it
SITE_URL=https://yourdomain.it
DATABASE_URL=postgres://cineuser:your_strong_password@postgres:5432/cinevicino
POSTGRES_USER=cineuser
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=cinevicino

# Cryptographically generated secret (openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_hex_32

# Admin dashboard credentials
ADMIN_EMAIL=admin@cinevicino.it
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_SLUG=gestione-riservata-cv

# External Services & GeoIP (Optional)
TMDB_API_KEY=your_tmdb_api_key_v3
FIRECRAWL_API_KEY=your_firecrawl_api_key
MAXMIND_LICENSE_KEY=your_maxmind_license_key
```

---

### Step 3: Launch with Docker Compose

```bash
# Build and start containers
docker compose up -d --build

# Verify container health
docker compose ps
docker compose logs -f app
```

---

### Step 4: Configure Let's Encrypt HTTPS with Certbot (Direct Port Mode)

If not using Cloudflare Tunnel:

```bash
# Request certificate (replace yourdomain.it and your@email.it)
docker run -it --rm --name certbot \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.it -d www.yourdomain.it \
  --email your@email.it --agree-tos --no-eff-email

# Reload Nginx with SSL enabled
docker compose restart nginx
```

---

### Step 5: Configure MaxMind GeoLite2-City Auto-Detection (Optional but Recommended)

CineVicino includes built-in visitor city auto-detection powered by a local self-hosted MaxMind GeoLite2-City binary database (`.mmdb`), resolving visitor coordinates at 0ms latency with zero API per-call costs. When paired with Cloudflare, it automatically extracts the visitor's real client IP from `CF-Connecting-IP`.

1. **Sign Up for a Free MaxMind Account**:
   - Register at [https://www.maxmind.com/en/geolite2/signup](https://www.maxmind.com/en/geolite2/signup).
2. **Generate a Free License Key**:
   - Navigate to **Account** -> **Manage License Keys** -> **Generate new license key**.
3. **Set the Key in `.env`**:
   ```ini
   MAXMIND_LICENSE_KEY=your_license_key_here
   ```
4. **Initial Download & Persistent Volume**:
   - The database auto-downloads on first visitor request or can be downloaded manually:
   ```bash
   docker compose exec -T app npx tsx scripts/update-geoip.ts
   ```
   The database (`GeoLite2-City.mmdb`, ~70MB) is persistently stored in the `./data/geoip/` volume mount across container rebuilds.
5. **Admin Diagnostics**:
   - You can inspect database status, file size, Cloudflare header presence, or trigger updates anytime from the Admin Diagnostics panel at `https://yourdomain.it/gestione-riservata-cv`.

---

### Step 6: Configure Scheduled Cron Jobs (Daily Scraper & Weekly GeoIP Update)

To keep all Italian showtimes fresh and ensure GeoLite2 IP mappings remain accurate (MaxMind releases updates twice weekly), add both jobs to your host crontab:

```bash
crontab -e
```

Add these lines:
```cron
# Run CineVicino nationwide cinema scraper every day at 12:05 PM
5 12 * * * cd /home/ubuntu/cinevicino && docker compose exec -T app npx tsx scripts/scrape.ts >> /var/log/cinevicino-scraper.log 2>&1

# Refresh MaxMind GeoLite2-City database every Sunday at 03:00 AM
0 3 * * 0 cd /home/ubuntu/cinevicino && docker compose exec -T app npx tsx scripts/update-geoip.ts >> /var/log/cinevicino-geoip.log 2>&1
```

---

### Step 7: Initial City Seeding (One-time)

Populate all 7,894 Italian comuni and coordinates into the database:

```bash
docker compose exec -T app npx tsx scripts/seed-cities.ts
```

---

### 🛡️ Dependency & Lockfile Hygiene Safeguard

To ensure clean, reproducible builds in Docker (`RUN npm ci` in builder and runner stages):

1. **Always Sync `package-lock.json`**:
   Whenever adding, updating, or removing dependencies in `package.json`, regenerate `package-lock.json` in the same commit:
   ```bash
   npm install
   ```
2. **Verify with `npm ci` Before Pushing**:
   Never assume `npm install` alone guarantees clean automated CI/Docker builds. Verify locally:
   ```bash
   npm run check:lockfile
   # or
   npm ci --dry-run
   ```
   Both the multi-stage `Dockerfile` builder (`npm ci`) and runner (`npm ci --omit=dev`) rely on an in-sync `package-lock.json` for deterministic, zero-tamper container builds without falling back to loose `npm install` workarounds.

---

Your CineVicino instance is now fully operational with automated updates, official ticketing outbound links, visitor city auto-detection, and SSL encryption!

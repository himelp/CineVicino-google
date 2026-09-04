# CineVicino — Oracle Cloud Always Free VPS Deployment Guide

This guide details the exact step-by-step procedure to deploy **CineVicino** to an Oracle Cloud Always Free VPS (ARM Ampere A1 or AMD Compute instance) using Docker Compose, Nginx reverse proxy, and Let's Encrypt SSL/TLS via Certbot.

---

## ⚠️ CRITICAL NOTICE: Oracle Cloud Inbound Port Opening (80 & 443)

On Oracle Cloud Infrastructure (OCI), opening ports requires **TWO separate layers**. Failing to configure both is the single most common reason why Oracle VPS sites are unreachable:

### 1. Virtual Cloud Network (VCN) Security List / Network Security Group
1. Navigate to the **OCI Console** → **Networking** → **Virtual Cloud Networks**.
2. Select your VCN and click on **Security Lists** (e.g. `Default Security List for <your-vcn>`).
3. Under **Ingress Rules**, click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80,443`
   - **Description**: `Allow HTTP and HTTPS traffic from the internet`
4. Click **Add Ingress Rules**.

### 2. Instance Linux Firewall (`iptables` / `firewalld` / `ufw`)
By default, Oracle Linux and Ubuntu OCI images have local firewall rules blocking incoming HTTP traffic even if ports are open in the VCN console:

```bash
# On Ubuntu / Debian:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Or on Oracle Linux / CentOS (firewalld):
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Or directly in iptables (Oracle Linux default iptables):
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save || sudo service iptables save
```

---

## Step 1: Install Docker & Docker Compose on the VPS

Run the following commands on your Oracle VPS instance:

```bash
# Update repositories
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

## Step 2: Clone the Repository & Configure Environment

```bash
# Clone the repository
git clone https://github.com/himelp/CineVicino-Cinema-Directory.git cinevicino
cd cinevicino

# Create production .env file (NEVER commit secrets to git)
cp .env.example .env
nano .env
```

Ensure your `.env` contains:
```ini
APP_URL=https://yourdomain.it
DATABASE_URL=postgres://cineuser:strong_password_here@postgres:5432/cinevicino
POSTGRES_USER=cineuser
POSTGRES_PASSWORD=strong_password_here
POSTGRES_DB=cinevicino

# API Keys (Optional but recommended)
TMDB_API_KEY=your_tmdb_api_key_v3
FIRECRAWL_API_KEY=your_firecrawl_api_key
EMAIL_ALERT_API_KEY=your_resend_or_sendgrid_key
ADMIN_PASSWORD=your_secure_admin_password
```

---

## Step 3: Launch with Docker Compose

```bash
# Build images and start all 3 containers (app, postgres, nginx) in background
docker compose up -d --build

# Verify all containers are running
docker compose ps
docker compose logs -f app
```

---

## Step 4: Configure Let's Encrypt HTTPS with Certbot

Run Certbot once to obtain your SSL certificate:

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

## Step 5: Configure Daily Scraper in Crontab (Daily at 12:05)

To keep all Italian showtimes and ticketing links fresh, schedule the nationwide scraper to run daily shortly after 12:00:

```bash
crontab -e
```

Add this cron line at the end of the file:
```cron
# Run CineVicino nationwide cinema scraper every day at 12:05 PM
5 12 * * * docker compose -f /home/ubuntu/cinevicino/docker-compose.yml exec -T app npx tsx scripts/scrape.ts >> /var/log/cinevicino-scraper.log 2>&1
```

---

## Step 6: Initial City Seeding (One-time)

Populate all 7,894 Italian comuni and coordinates into the database:

```bash
docker compose exec app npx tsx scripts/seed-cities.ts
```

Your CineVicino instance is now fully operational across Italy with automated updates, official ticketing outbound links, and SSL encryption!

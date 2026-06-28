# SecureAnno VPS Deployment

Ye guide Hostinger VPS/Ubuntu server par SecureAnno ko `https://secureanno.com` aur `https://www.secureanno.com` se 24x7 run karne ke liye hai.

## 1. GitHub Par Upload

Local project se:

```bash
git init
git add .
git commit -m "Initial SecureAnno deployment"
git branch -M main
git remote add origin https://github.com/1919Sand/SecureAnno.git
git push -u origin main
```

Important: `.env`, `node_modules/`, `logs/`, aur `data/leads.jsonl` GitHub par upload nahi honge.

## 2. Domain DNS

Hostinger domain DNS me ye records set karo:

```text
A      @      187.127.145.233
A      www    187.127.145.233
```

DNS propagation me kuch minutes se kuch hours lag sakte hain.

## 3. VPS Par Code Clone

VPS me SSH karo:

```bash
ssh root@187.127.145.233
```

App folder banao aur GitHub se code clone karo:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone https://github.com/1919Sand/SecureAnno.git /var/www/secureanno
cd /var/www/secureanno
```

## 4. One-Time VPS Setup

Ye command Node.js, Nginx, PM2 install karegi, dependencies install karegi, aur app start karegi:

```bash
bash setup-vps.sh /var/www/secureanno
```

Script ke end me jo `pm2 startup` command dikhe, usko copy karke run karo. Usually command kuch aisi hogi:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
pm2 save
```

## 5. Environment Configure

```bash
nano /var/www/secureanno/.env
```

Recommended production values:

```env
PORT=3000
HOST=127.0.0.1
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://secureanno.com,https://www.secureanno.com

# Optional PostgreSQL lead storage.
# Blank chhodoge to leads data/leads.jsonl me save honge.
DATABASE_URL=
PG_POOL_MAX=10
```

Change ke baad restart:

```bash
pm2 restart secureanno
```

## 6. Nginx Reverse Proxy

```bash
sudo cp /var/www/secureanno/deploy/nginx.secureanno.conf.example /etc/nginx/sites-available/secureanno.conf
sudo ln -sf /etc/nginx/sites-available/secureanno.conf /etc/nginx/sites-enabled/secureanno.conf
sudo nginx -t
sudo systemctl reload nginx
```

Ab test karo:

```bash
curl http://127.0.0.1:3000/health
curl http://secureanno.com/health
```

## 7. SSL Enable

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d secureanno.com -d www.secureanno.com
```

SSL renew automatically hota hai. Check:

```bash
sudo systemctl status certbot.timer
```

## 8. Future Updates From GitHub

Jab bhi GitHub par new code push karo, VPS par:

```bash
cd /var/www/secureanno
git pull origin main
bash start-production.sh
```

Agar VPS par uncommitted local changes error aaye, pehle check karo:

```bash
git status
```

Production `.env`, `data/`, aur `logs/` Git me tracked nahi hain, isliye normal updates me conflict nahi aana chahiye.

## PM2 Commands

```bash
pm2 status
pm2 logs secureanno
pm2 restart secureanno
pm2 stop secureanno
```

## Database Optional Hai

App PostgreSQL ke bina bhi chalega. Contact form leads local file me save hongi:

```text
/var/www/secureanno/data/leads.jsonl
```

Agar PostgreSQL use karna hai:

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql
```

PostgreSQL prompt me:

```sql
CREATE USER secureanno WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE secureanno_leads OWNER secureanno;
\q
```

`.env` me:

```env
DATABASE_URL=postgresql://secureanno:CHANGE_THIS_PASSWORD@localhost:5432/secureanno_leads
```

Schema create:

```bash
cd /var/www/secureanno
npm run db:setup
pm2 restart secureanno
```

## Troubleshooting

```bash
node --version
npm --version
pm2 status
pm2 logs secureanno
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
curl http://127.0.0.1:3000/health
```

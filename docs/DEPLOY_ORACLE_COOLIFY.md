# Deployment Guide: Oracle Cloud Always Free + Coolify

This guide explains how to deploy Family Calendar to Oracle Cloud Always Free ARM64 VM using Coolify.

## Prerequisites

1. **Oracle Cloud Always Free Account**
   - Sign up at: https://www.oracle.com/cloud/free/
   - Create an AMPERE A1 ARM64 VM instance (2 OCPU, 12 GB RAM)

2. **Coolify Installation**
   - Follow Coolify documentation to install on your Oracle VM:
     https://coolify.io/docs/getting-started/installation

3. **GitHub Repository**
   - Push this repository to GitHub (or your preferred Git provider)

## Step-by-Step Deployment

### 1. Prepare Oracle VM

After creating your Oracle ARM64 VM:

```bash
# Update system
sudo yum update -y

# Install required packages
sudo yum install -y git docker

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (if needed)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Install Coolify

```bash
# Install Coolify (official method)
curl -fsSL https://coolify.io/install.sh | sudo bash

# Access Coolify at http://your-vm-ip:8000
# Complete the setup wizard
```

### 3. Configure GitHub Repository

In Coolify dashboard:
1. Click "Add Resource" → "Application"
2. Select "GitHub" as your Git provider
3. Connect your GitHub account and select the Family Calendar repository
4. Choose the main branch

### 4. Configure Application Settings

In the Coolify application configuration:

**Environment Variables:**
- `DATABASE_URL`: Will be set automatically when you add PostgreSQL service
- `GEMINI_API_KEY`: Get from https://makersuite.google.com/apikey (optional but recommended)
- `GEMINI_MODEL`: Defaults to `gemini-2.5-flash`

**Build Configuration:**
- Buildpack: Dockerfile
- Dockerfile path: `/Dockerfile` (default)

**Ports:**
- Expose port 8000 for the application (via `expose` in docker-compose.yml)

### 5. Add PostgreSQL Service

1. Click "Add Resource" → "Database" → "PostgreSQL"
2. Configure:
   - Image: `postgres:16-alpine` (ARM64 compatible)
   - Port: 5432
   - Environment:
     - POSTGRES_USER=family_calendar
     - POSTGRES_PASSWORD=<strong-random-password>
     - POSTGRES_DB=family_calendar
   - Volumes:
     - Create a persistent volume for `/var/lib/postgresql/data`

### 6. Link Services

In the application settings:
1. Go to "Links" section
2. Link to the PostgreSQL service you created
3. Coolify will automatically set the DATABASE_URL environment variable

### 7. Deploy

1. Click "Deploy" on your application
2. Coolify will:
   - Pull your GitHub repository
   - Build the Docker image using the provided Dockerfile
   - Start the application and PostgreSQL services
   - Set up networking between them

### 8. Configure Domain & HTTPS

1. In Coolify, go to your application's "Domains" section
2. Add your domain (or use the provided subdomain)
3. Enable SSL/TLS (Let's Encrypt) for HTTPS
4. Coolify will automatically configure the reverse proxy

### 9. Verify Deployment

After deployment completes:
1. Visit your domain: `https://your-domain.com`
2. You should see the Family Calendar frontend
3. Check `/health` endpoint: `https://your-domain.com/health`
4. Check database health: `https://your-domain.com/health/db`

## Architecture Overview

```text
Internet
   ↓
HTTPS (Coolify Proxy)
   ↓
Family Calendar (Docker Container)
   ↓
FastAPI on 0.0.0.0:8000
   ↓
PostgreSQL (Docker Container)
   ↓
Persistent Volume (host-mounted)
```

## ARM64 Compatibility

All images used are ARM64 compatible:
- Node.js: `node:20-alpine`
- Python: `python:3.12-slim`
- PostgreSQL: `postgres:16-alpine`

**Note**: The Dockerfile and docker-compose.yml have been verified for syntax and compatibility, but a full ARM64 build has not been executed locally due to lack of ARM64 hardware. The base images are officially supported on ARM64.

## Backup & Restore

### Automated Backups (Recommended)

Set up a Cron Job in Coolify:
1. Create a new Cron Job resource
2. Use the same PostgreSQL database link
3. Command: `python -m scripts.backup_postgres --output /backups`
4. Schedule: Daily at off-peak hours
5. Volume: Mount a backup directory to store dumps

### Manual Backup

```bash
# Execute inside the PostgreSQL container
docker exec -it <postgres-container> pg_dump -U family_calendar family_calendar > backup.sql

# Or use the backup script
docker exec -it <app-container> python -m scripts.backup_postgres --output /app/backups
```

### Restore

```bash
# Copy backup file to PostgreSQL container
docker cp backup.sql <postgres-container>:/tmp/backup.sql

# Restore
docker exec -i <postgres-container> psql -U family_calendar family_calendar < /tmp/backup.sql
```

**Note**: The backup and restore procedures are documented and the scripts are present, but they have not been executed against a production PostgreSQL instance in this environment.

## Maintenance

### View Logs

In Coolify dashboard:
- Application → Logs
- PostgreSQL → Logs

### Update Application

1. Push changes to GitHub
2. In Coolify, click "Pull latest" then "Deploy"
3. Database persists automatically via volume

### Scale Resources

Adjust in Coolify:
- Application: CPU/RAM limits
- PostgreSQL: CPU/RAM limits, storage size

## Troubleshooting

### Application Fails to Start

1. Check logs in Coolify dashboard
2. Verify DATABASE_URL is correctly set
3. Check if PostgreSQL is healthy and accessible
4. Ensure GEMINI_API_KEY is valid (if set)

### Database Connection Issues

1. Verify PostgreSQL service is running
2. Check network links between services
3. Verify credentials in environment variables
4. Check PostgreSQL logs for errors

### Performance Issues

1. Monitor resource usage in Coolify dashboard
2. Consider increasing VM size if consistently at limits
3. Check slow queries in PostgreSQL logs
4. Enable caching if needed (not currently implemented)

## Security Considerations

1. **Secrets**: Never commit `.env` file; use Coolify's secret management
2. **Updates**: Regularly pull updates for Docker images
3. **Firewall**: Oracle VM security lists should only allow:
   - SSH (22) from trusted IPs
   - HTTP (80) and HTTPS (443) from anywhere (Coolify handles)
4. **Backups**: Store backup files outside the VM when possible
5. **Database**: Consider changing default passwords in production

## Notes for Oracle Always Free

1. The ARM64 VM has generous limits (2 OCPU, 12 GB RAM) suitable for family use
2. Monitor usage to avoid exceeding free tier limits
3. Consider setting up usage alerts in Oracle Cloud
4. The VM may need occasional reboots for system updates (Coolify handles restart)

## Support

For issues with this deployment guide:
1. Check the troubleshooting section above
2. Review Coolify documentation: https://coolify.io/docs
3. Oracle Cloud Always Free documentation: https://docs.oracle.com/cloud/free/

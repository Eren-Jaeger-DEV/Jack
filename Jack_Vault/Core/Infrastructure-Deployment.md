---
id: infrastructure-deployment
category: Maintenance
status: Documentation
---

# 🚀 Infrastructure & Deployment

This note provides the technical details for hosting, deploying, and managing the Jack bot production environment.

## 🛰️ Host Details

| Feature | Specification |
| --- | --- |
| **Provider** | Google Cloud Platform (GCP) |
| **VM Name** | `jack-bot-vm` |
| **Zone** | `asia-south2-a` |
| **User** | `gahlautanshuman384` |
| **Path** | `/home/gahlautanshuman384/Jack` |

## ⚙️ Process Management

The bot is managed using **PM2**, which ensures it automatically restarts upon crashing or system reboot.

### Common Commands
```bash
# View live logs
pm2 logs jack

# Restart the bot (after a git pull)
pm2 restart jack

# View performance metrics
pm2 monit
```

## 🐙 Deployment Workflow
To update the production bot from your local code:
1. **Commit & Push**: `git commit -m "..." && git push origin main`
2. **SSH into VM**: `gcloud compute ssh jack-bot-vm --zone=asia-south2-a`
3. **Switch User**: `sudo su - gahlautanshuman384`
4. **Pull & Restart**: `cd Jack && git pull && pm2 restart jack`

---
**Related Documents:** [[00 - Home]], [[Config-Manager]], [[ErrorHandler]]

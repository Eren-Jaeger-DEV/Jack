#!/bin/bash

# Trigger production deployment on the Jack Bot VM
# Required: gcloud CLI and correct project/zone configuration

echo "🔌 Connecting to Jack Bot VM (asia-south2-a)..."

# Ensure latest code is pulled, script is executable, then run it
gcloud compute ssh jack-bot-vm --zone=asia-south2-a --command "sudo su - gahlautanshuman384 -c 'cd Jack && git pull origin main && chmod +x deploy.sh && ./deploy.sh'"

echo "✨ Synchronization Complete."

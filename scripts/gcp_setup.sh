#!/bin/bash
set -e

# Setup staging profile
echo "==> Configuring nords-staging..."
gcloud config configurations create nords-staging || true
gcloud config set project nords-staging-proj
gcloud config set compute/region us-central1

# Setup prod profile
echo "==> Configuring nords-prod..."
gcloud config configurations create nords-prod || true
gcloud config set project nords-prod-proj
gcloud config set compute/region us-central1

echo ""
echo "WARNING [GCP Architect Note]:"
echo "Ensure networking provisions a Serverless VPC Access Connector for the Cloud Run environment."
echo "Cloud Run must use Private IPs to communicate securely with Cloud SQL and Memorystore without traversing the public internet."
echo ""
echo "Activate a profile using: gcloud config configurations activate <profile-name>"

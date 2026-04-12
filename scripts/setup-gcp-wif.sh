#!/bin/bash
# setup-gcp-wif.sh

# Ensure gcloud is in the PATH (Homebrew apple silicon default path)
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:$PATH

# This script configures GCP Workload Identity Federation for GitHub Actions.
# Make sure you have run `gcloud auth login` and `gcloud config set project nords-spatial-1776012153` before running.

PROJECT_ID="nords-spatial-1776012153"
GITHUB_REPO="themightyboosh/nords"
SERVICE_ACCOUNT="github-deployer"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-provider"

# 1. Create a Service Account
gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="GitHub Actions Deployer" \
    --project=$PROJECT_ID

# Get the Project Number (required for WIF)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SA_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

# 2. Grant roles to the Service Account
# Artifact Registry Writer (to push docker containers)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/artifactregistry.writer"

# Cloud Run Admin (to deploy Cloud Run services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/run.admin"

# Firebase Admin (to deploy to Firebase Hosting)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/firebase.admin"

# Service Account User (required to deploy Cloud Run)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

# 3. Create Workload Identity Pool
gcloud iam workload-identity-pools create $POOL_NAME \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# 4. Create Workload Identity Provider (GitHub)
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# 5. Connect the GitHub Repo to the Service Account
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_REPO}"

echo ""
echo "=========================================================="
echo "SUCCESS! Add these to your GitHub Secrets/Variables:"
echo ""
echo "GCP_WORKLOAD_IDENTITY_PROVIDER:"
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
echo ""
echo "GCP_SERVICE_ACCOUNT:"
echo "${SA_EMAIL}"
echo "=========================================================="

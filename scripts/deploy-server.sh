#!/bin/bash
# deploy-server.sh
# Requires gcloud CLI and authenticated access to the project.

PROJECT_ID="nords-spatial-1776012153"
REGION="us-central1"
SERVICE_NAME="nords-engine"

# Ensure we are passing the project ID explicitly
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME ../server --project=$PROJECT_ID

gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production"

#!/bin/bash

echo "🚀 Starting deployment process for MERN Stack Monorepo..."

# Set environment variables
export NODE_ENV="production"
# Set your API URL here or via environment variable
export REACT_APP_API_URL="${REACT_APP_API_URL:-http://localhost:5000/api}"

# Set your Google Cloud project ID here or via environment variable
GCP_PROJECT="${GCP_PROJECT:-your-project-id}"

echo "🔧 Building backend..."
cd packages/backend
npm run build

echo "🚀 Deploying backend as default service to Google Cloud..."
gcloud app deploy app.yaml --project="${GCP_PROJECT}" --quiet

echo "📦 Building frontend..."
cd ../frontend
rm -rf build
rm -rf node_modules/.cache
npm run build

echo "🌐 Deploying frontend service to Google Cloud..."
gcloud app deploy app.yaml --project="${GCP_PROJECT}" --quiet

echo "✅ Monorepo deployment complete!"
echo "⚠️  Update the URLs below with your actual deployment URLs"
echo "🌐 Frontend: https://frontend-dot-${GCP_PROJECT}.ue.r.appspot.com"
echo "🔧 Backend API: https://${GCP_PROJECT}.ue.r.appspot.com"


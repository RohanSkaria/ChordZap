# Migration Guide: Moving to Personal GitHub Repository

This guide will help you migrate this project from your school's private GitHub repository to your personal public GitHub repository while ensuring all sensitive information is removed.

## ✅ Pre-Migration Checklist

All sensitive credentials have been sanitized from the codebase:
- ✅ `packages/backend/app.yaml` - All API keys, secrets, and MongoDB credentials removed
- ✅ `packages/frontend/app.yaml` - Sensitive URLs removed
- ✅ `scripts/deploy.sh` - Google Cloud project name parameterized
- ✅ `.gitignore` - Updated to exclude sensitive files

## 🔐 Environment Variables Setup

Before running the application, you'll need to set up environment variables. Create the following files:

### Backend Environment Variables

Create `packages/backend/.env`:

```env
# Node Environment
NODE_ENV=development

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/ChordZapDB
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

# CORS Origin (frontend URL)
CORS_ORIGIN=http://localhost:3000

# ACRCloud API Configuration
# Get these from https://www.acrcloud.com/
ACR_HOST=identify-eu-west-1.acrcloud.com
ACR_ACCESS_KEY=your_acr_access_key_here
ACR_ACCESS_SECRET=your_acr_access_secret_here

# AUDD API Token (optional)
# Get this from https://audd.io/
AUDD_API_TOKEN=your_audd_api_token_here
```

### Frontend Environment Variables

Create `packages/frontend/.env`:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:5000/api

# For production, set this to your deployed backend URL
# REACT_APP_API_URL=https://your-backend-url.com/api
```

## 📦 Migration Steps

### Step 1: Create New Repository on Personal GitHub

1. Go to your personal GitHub account
2. Create a new repository (public or private, your choice)
3. **Do NOT initialize with README, .gitignore, or license** (we'll push existing code)

### Step 2: Remove Old Remote and Add New Remote

```bash
# Check current remotes
git remote -v

# Remove the old school GitHub remote
git remote remove origin

# Add your personal GitHub repository as the new remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify the new remote
git remote -v
```

### Step 3: Push All Branches and History

```bash
# Push all branches and tags to the new repository
git push -u origin --all
git push -u origin --tags
```

### Step 4: Verify Migration

1. Check your new GitHub repository
2. Verify all commits and branches are present
3. Check that no sensitive files are visible in the repository

## 🚀 Post-Migration Setup

### For Local Development

1. Clone the new repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. Install dependencies:
   ```bash
   npm install
   cd packages/backend && npm install
   cd ../frontend && npm install
   cd ../shared && npm install
   ```

3. Set up environment variables (see above)

4. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   cd packages/backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd packages/frontend
   npm start
   ```

### For Production Deployment

1. Update `scripts/deploy.sh` with your Google Cloud project ID:
   ```bash
   export GCP_PROJECT="your-project-id"
   ```

2. Or set it as an environment variable:
   ```bash
   GCP_PROJECT=your-project-id ./scripts/deploy.sh
   ```

3. Update `app.yaml` files with your actual environment variables via Google Cloud Console or by setting them in the deployment configuration.

## 🔍 Final Security Check

Before making the repository public, verify:

- [ ] No `.env` files are committed
- [ ] No API keys or secrets in `app.yaml` files
- [ ] No hardcoded credentials in source code
- [ ] No database connection strings with passwords
- [ ] `.gitignore` properly excludes sensitive files

## 📝 Additional Notes

- The `app.yaml` files are now sanitized and contain placeholders
- For Google Cloud deployments, set environment variables through the Google Cloud Console
- All sensitive values should be managed through environment variables or secret management services
- Consider using GitHub Secrets for CI/CD if you set up automated deployments

## 🆘 Troubleshooting

If you encounter issues:

1. **Missing environment variables**: Make sure you've created `.env` files in both `packages/backend` and `packages/frontend`
2. **Git history not preserved**: Make sure you used `--all` flag when pushing
3. **Sensitive data still visible**: Check git history with `git log --all --full-history -- <file>` and consider using `git filter-branch` or BFG Repo-Cleaner if needed

## 📚 Resources

- [GitHub Docs: Moving a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/duplicating-a-repository)
- [GitHub Docs: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)


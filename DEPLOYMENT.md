# 🚀 Deployment Guide

This guide explains how to deploy your Factory Standard Procedure System to both Vercel (frontend) and Render (backend).

## 📋 Prerequisites

- GitHub account
- Vercel account (free)
- Render account (free)
- Node.js installed locally

## 🎯 Deployment Strategy

- **Frontend**: Deploy to Vercel (static hosting)
- **Backend**: Deploy to Render (Node.js hosting)
- **Database**: SQLite in-memory (ephemeral storage for Render)

## 🌐 Backend Deployment (Render)

### 1. Prepare Your Code

Your backend is already configured for Render with:
- `render.yaml` - Render service configuration
- `.renderignore` - Files to exclude from deployment
- Health check endpoint (`/health`)
- In-memory database for production

### 2. Deploy to Render

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Go to [render.com](https://render.com)**
   - Sign up/login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the service:**
   - **Name**: `fsps-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

4. **Environment Variables (optional):**
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render sets this automatically)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your backend URL: `https://your-app-name.onrender.com`

## 🎨 Frontend Deployment (Vercel)

### 1. Update API Configuration

1. **Edit `src/config.js`:**
   ```javascript
   const config = {
       // Replace with your actual Render backend URL
       API_BASE_URL: 'https://your-render-backend-name.onrender.com',
   };
   ```

2. **Rebuild frontend:**
   ```bash
   npm run build
   ```

### 2. Deploy to Vercel

1. **Push updated code to GitHub:**
   ```bash
   git add .
   git commit -m "Update API endpoints for Render backend"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
   - Sign up/login
   - Click "New Project"
   - Import your GitHub repository

3. **Configure the project:**
   - **Framework Preset**: `Other`
   - **Build Command**: `npm run build`
   - **Output Directory**: `public`
   - **Install Command**: `npm install`

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your frontend will be available at: `https://your-project.vercel.app`

## 🔧 Alternative: Command Line Deployment

### Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

### Render CLI (if available)
```bash
render deploy
```

## 🌍 Environment Configuration

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3000`
- Database: Local SQLite file

### Production
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-app-name.onrender.com`
- Database: In-memory SQLite (ephemeral)

## ⚠️ Important Notes

### Render Backend Limitations
- **Free tier**: Sleeps after 15 minutes of inactivity
- **Database**: In-memory SQLite (data lost on restart)
- **Cold starts**: First request may be slow

### Vercel Frontend Limitations
- **Free tier**: 100GB bandwidth/month
- **Build time**: 100 minutes/month
- **Serverless functions**: Not used in this setup

## 🔄 Updating Deployments

### Backend Updates
1. Make changes to `server.js`
2. Push to GitHub
3. Render automatically redeploys

### Frontend Updates
1. Update `src/config.js` if backend URL changes
2. Make other frontend changes
3. Push to GitHub
4. Vercel automatically redeploys

## 🧪 Testing Your Deployment

1. **Test backend health:**
   ```
   GET https://your-backend.onrender.com/health
   ```

2. **Test frontend:**
   - Open your Vercel URL
   - Try scanning components
   - Check if API calls work

3. **Monitor logs:**
   - Render dashboard shows backend logs
   - Vercel dashboard shows frontend build logs

## 🆘 Troubleshooting

### Common Issues

1. **CORS errors:**
   - Backend already has CORS enabled
   - Check if backend URL is correct in frontend config

2. **API timeouts:**
   - Render free tier has cold starts
   - First request may take 10-30 seconds

3. **Database issues:**
   - Production uses in-memory database
   - Data is lost on service restart

4. **Build failures:**
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`

### Getting Help
- Render documentation: [docs.render.com](https://docs.render.com)
- Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Check deployment logs in respective dashboards

## 🎉 Success!

Once deployed, your Factory Standard Procedure System will be accessible worldwide through:
- **Frontend**: `https://your-project.vercel.app`
- **Backend API**: `https://your-backend.onrender.com`

The system will work exactly as it does locally, but with global accessibility and automatic scaling!

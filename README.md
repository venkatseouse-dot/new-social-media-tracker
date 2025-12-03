# 🚀 Social Media Analytics Tracker

Complete social media tracking solution with cross-device sync, real-time analytics, and advanced features.

## ✨ Features

### 📊 **Analytics Tracking**
- **YouTube**: Views, likes, comments tracking
- **Instagram**: Likes, comments, shares tracking
- **Real-time data**: Automatic interval-based updates
- **Historical data**: Charts and data tables

### 🔄 **Cross-Device Sync**
- **Sync Codes**: Share data across devices
- **Cloud Storage**: Upstash Redis backend
- **Real-time sync**: Changes sync instantly

### 🎯 **Advanced Features**
- **API Management**: Multiple YouTube/Apify API keys
- **Quota Tracking**: Monitor API usage
- **Data Visualization**: Interactive charts
- **Export/Import**: JSON data export
- **Filtering**: By platform, user, date

## 🛠️ Setup

### 1. **Local Development**
```bash
# Open index.html in browser
open index.html
```

### 2. **Cloud Deployment (Vercel)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 3. **Environment Variables**
Set in Vercel dashboard:
```
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## 🔑 API Keys Required

### **YouTube API**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Create API key
4. Add to app

### **Apify API (Instagram)**
1. Sign up at [Apify.com](https://apify.com/)
2. Get API token
3. Add to app

### **Upstash Redis (Cloud Sync)**
1. Sign up at [Upstash.com](https://upstash.com/)
2. Create Redis database
3. Get REST URL and token
4. Add to Vercel environment variables

## 📱 How to Use

### **Step 1: Setup APIs**
- Add YouTube API key
- Add Apify token for Instagram
- Generate sync code for cross-device access

### **Step 2: Add Content**
- Paste YouTube/Instagram URLs
- Set tracking intervals
- Start tracking

### **Step 3: Monitor Analytics**
- View real-time stats
- Check charts and tables
- Export data

### **Step 4: Sync Across Devices**
- Use same sync code on multiple devices
- Data syncs automatically

## 📁 File Structure

```
social-media-tracker-final/
├── index.html          # Main application
├── script.js           # Complete functionality
├── styles.css          # Modern styling
├── api/
│   └── tracked-items.js # Cloud sync API
├── package.json        # Dependencies
├── vercel.json         # Deployment config
└── README.md           # This file
```

## 🎨 Features Overview

- **Modern UI**: Glassmorphic design
- **Responsive**: Works on mobile/desktop
- **Real-time**: Live data updates
- **Cross-platform**: YouTube + Instagram
- **Multi-user**: User management
- **Cloud sync**: Access anywhere
- **Data export**: JSON format
- **Charts**: Interactive visualizations

## 🚀 Ready to Deploy!

This is a complete, production-ready social media analytics tracker with all features implemented.
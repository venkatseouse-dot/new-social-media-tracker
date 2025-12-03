# Google Sheets Integration Setup

## Step 1: Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the content from `google-apps-script.js`
4. Save the project with a name like "Social Media Tracker API"

## Step 2: Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Click "Deploy"
6. Copy the Web App URL (it looks like: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`)

## Step 3: Update Script.js

1. Open `script.js`
2. Find `YOUR_SCRIPT_ID` (appears twice)
3. Replace with your actual script ID from the Web App URL

## Step 4: Create Google Sheet

1. Create a new Google Sheet
2. Copy the sheet URL
3. Paste it in the app's Google Sheets section
4. Click "Save Sheet"

## Step 5: Set Permissions

1. Make sure your Google Sheet is accessible (share with "Anyone with the link can edit")
2. The Apps Script will handle reading/writing data

## How It Works

- **Auto-sync**: Data automatically syncs to Google Sheets when updated
- **Cross-device**: Access your data from any browser by entering the same Google Sheet URL
- **Persistent**: Data survives browser clearing, computer changes, etc.
- **Real-time**: All changes are immediately saved to Google Sheets

## Data Structure

The Google Sheet will contain columns:
- ID, Name, URL, Platform, User, API Owner, Interval, Is Tracking
- Latest Views, Latest Likes, Latest Comments, Last Updated, Data Points

## Troubleshooting

- If sync fails, data falls back to localStorage
- Check browser console for error messages
- Ensure Google Sheet URL is correct and accessible
- Verify Apps Script deployment permissions
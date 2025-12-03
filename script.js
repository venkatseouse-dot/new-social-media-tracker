let trackedItems = [];
let googleSheetUrl = localStorage.getItem('google_sheet_url') || '';
let googleSheetId = '';
let googleApiKey = '';


let trackingIntervals = {};
let quotaUsed = parseInt(localStorage.getItem('youtube_quota_used') || '0');
let quotaResetTime = localStorage.getItem('youtube_quota_reset') || new Date().toDateString();
let instagramQuotaUsed = parseFloat(localStorage.getItem('instagram_quota_used') || '0');
let instagramQuotaLimit = 10.00; // $10 daily limit
let instagramQuotaResetTime = localStorage.getItem('instagram_quota_reset') || new Date().toDateString();

document.addEventListener('DOMContentLoaded', async function() {
    // Load Google Sheets URL
    const savedSheetUrl = localStorage.getItem('google_sheet_url');
    if (savedSheetUrl) {
        document.getElementById('googleSheetUrl').value = savedSheetUrl;
        googleSheetUrl = savedSheetUrl;
        extractSheetId(savedSheetUrl);
        loadFromGoogleSheets();
    } else {
        // Load data from localStorage as fallback
        const local = localStorage.getItem('trackedItems');
        trackedItems = local ? JSON.parse(local) : [];
    }
    
    // Migrate old data to new format
    migrateOldData();
    
    // Auto-load saved APIs
    autoLoadSavedAPIs();
    
    const savedKey = localStorage.getItem('youtube_api_key');
    if (savedKey) {
        updateApiStatus(true);
    } else {
        updateApiStatus(false);
    }
    
    updateInstagramQuotaDisplay();
    renderSavedKeys();
    renderTrackedItems();
    updateStatus();
    initializeApifyStatus();
    
    trackedItems.forEach(item => {
        if (item.isTracking) {
            item.isTracking = false;
            startTracking(item.id);
        }
    });
});

function autoLoadSavedAPIs() {
    const youtubeAPIs = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
    const apifyAPIs = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
    
    // Debug logging
    console.log('Auto-loading APIs:', {
        youtubeAPIs: youtubeAPIs,
        apifyAPIs: apifyAPIs,
        currentYTKey: localStorage.getItem('youtube_api_key'),
        currentYTOwner: localStorage.getItem('current_youtube_owner')
    });
    
    // Auto-load the first available YouTube API if none is currently set
    const ytOwners = Object.keys(youtubeAPIs);
    if (ytOwners.length > 0) {
        const currentKey = localStorage.getItem('youtube_api_key');
        const currentOwner = localStorage.getItem('current_youtube_owner');
        
        // If no current key or current owner's key doesn't exist, load first available
        if (!currentKey || !currentOwner || !youtubeAPIs[currentOwner]) {
            const firstOwner = ytOwners[0];
            localStorage.setItem('youtube_api_key', youtubeAPIs[firstOwner]);
            localStorage.setItem('current_youtube_owner', firstOwner);
            console.log('Auto-loaded YouTube API for:', firstOwner);
        }
    }
    
    // Auto-load the first available Apify API if none is currently set
    const apifyOwners = Object.keys(apifyAPIs);
    if (apifyOwners.length > 0) {
        const currentToken = localStorage.getItem('apify_token');
        const currentOwner = localStorage.getItem('current_apify_owner');
        
        // If no current token or current owner's token doesn't exist, load first available
        if (!currentToken || !currentOwner || !apifyAPIs[currentOwner]) {
            const firstOwner = apifyOwners[0];
            localStorage.setItem('apify_token', apifyAPIs[firstOwner]);
            localStorage.setItem('current_apify_owner', firstOwner);
            console.log('Auto-loaded Apify API for:', firstOwner);
        }
    }
    
    // Load data for current keys
    if (ytOwners.length > 0 || apifyOwners.length > 0) {
        loadDataForCurrentKey();
    }
}

function migrateOldData() {
    // Check if there's old data in trackedItems that needs migration
    const oldTrackedItems = JSON.parse(localStorage.getItem('trackedItems') || '[]');
    const apiOwnerData = JSON.parse(localStorage.getItem('api_owner_data') || '{}');
    
    if (oldTrackedItems.length > 0) {
        // Migrate old data to new format
        oldTrackedItems.forEach(item => {
            const owner = item.apiOwner || 'Default';
            if (!apiOwnerData[owner]) apiOwnerData[owner] = [];
            
            // Check if item already exists
            const exists = apiOwnerData[owner].some(existing => existing.id === item.id);
            if (!exists) {
                apiOwnerData[owner].push(item);
            }
        });
        
        localStorage.setItem('api_owner_data', JSON.stringify(apiOwnerData));
        console.log('Migrated old data to new format');
    }
}

function renderSavedKeys() {
    // This function is deprecated - using renderSavedAPIs instead
    renderSavedAPIs();
}

function switchToYouTubeKey(owner) {
    const savedKeys = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
    const key = savedKeys[owner];
    
    if (key) {
        localStorage.setItem('youtube_api_key', key);
        localStorage.setItem('current_youtube_owner', owner);
        updateApiStatus(true);
        loadDataForCurrentKey();
        alert(`Switched to ${owner}'s YouTube API`);
    }
}

function switchToApifyToken(owner) {
    const savedTokens = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
    const token = savedTokens[owner];
    
    if (token) {
        localStorage.setItem('apify_token', token);
        localStorage.setItem('current_apify_owner', owner);
        loadDataForCurrentKey();
        alert(`Switched to ${owner}'s Apify API`);
    }
}

async function saveYouTubeAPI() {
    const key = document.getElementById('ytApiKey').value.trim();
    const owner = document.getElementById('ytOwnerName').value.trim();
    
    if (!key || !owner) {
        alert('Please enter both API key and owner name');
        return;
    }
    
    // Basic validation for API key format
    if (key.length < 30 || !key.startsWith('AIza')) {
        alert('Invalid API key format. YouTube API keys should start with "AIza" and be at least 30 characters long.');
        return;
    }
    
    try {
        const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${key}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'API validation failed');
        }
        
        if (!data.items || data.items.length === 0) {
            // API key is valid but video might not exist, that's okay
            console.log('API key valid, test video not found (normal)');
        }
        
        const savedAPIs = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
        savedAPIs[owner] = key;
        localStorage.setItem('saved_youtube_apis', JSON.stringify(savedAPIs));
        
        localStorage.setItem('youtube_api_key', key);
        localStorage.setItem('current_youtube_owner', owner);
        
        // Debug logging
        console.log('YouTube API saved:', {
            owner: owner,
            keyLength: key.length,
            savedAPIs: savedAPIs,
            currentKey: localStorage.getItem('youtube_api_key'),
            currentOwner: localStorage.getItem('current_youtube_owner')
        });
        
        document.getElementById('ytApiKey').value = '';
        document.getElementById('ytOwnerName').value = '';
        renderSavedAPIs();
        updateApiStatus(true);
        loadDataForCurrentKey();
        alert('YouTube API saved and activated successfully!');
    } catch (error) {
        console.error('API validation error:', error);
        alert('Invalid API key: ' + error.message);
    }
}

async function saveApifyAPI() {
    const token = document.getElementById('apifyApiToken').value.trim();
    const owner = document.getElementById('apifyOwnerName').value.trim();
    
    if (!token || !owner) {
        alert('Please enter both API token and owner name');
        return;
    }
    
    try {
        const response = await fetch('https://api.apify.com/v2/users/me', {
            headers: { 'Authorization': 'Bearer ' + token.trim() }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        const savedAPIs = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
        savedAPIs[owner] = token;
        localStorage.setItem('saved_apify_apis', JSON.stringify(savedAPIs));
        
        localStorage.setItem('apify_token', token);
        localStorage.setItem('current_apify_owner', owner);
        
        document.getElementById('apifyApiToken').value = '';
        document.getElementById('apifyOwnerName').value = '';
        renderSavedAPIs();
        initializeApifyStatus();
        loadDataForCurrentKey();
        alert('Apify API saved and activated successfully!');
    } catch (error) {
        const apifyStatus = document.getElementById('apifyStatus');
        if (apifyStatus) {
            apifyStatus.innerHTML = `<span style="color: red;">❌ Invalid token: ${error.message}</span>`;
        }
        alert('Invalid token: ' + error.message);
    }
}

function renderSavedAPIs() {
    const youtubeAPIs = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
    const apifyAPIs = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
    
    const ytContainer = document.getElementById('savedYouTubeAPIs');
    const apifyContainer = document.getElementById('savedApifyAPIs');
    
    ytContainer.innerHTML = Object.keys(youtubeAPIs).map(owner => 
        `<button class="api-switch-btn" onclick="switchToYouTubeAPI('${owner}')">${owner}</button>`
    ).join('');
    
    apifyContainer.innerHTML = Object.keys(apifyAPIs).map(owner => 
        `<button class="api-switch-btn" onclick="switchToApifyAPI('${owner}')">${owner}</button>`
    ).join('');
}

function switchToYouTubeAPI(owner) {
    const savedAPIs = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
    const key = savedAPIs[owner];
    
    if (key) {
        localStorage.setItem('youtube_api_key', key);
        localStorage.setItem('current_youtube_owner', owner);
        loadDataForCurrentKey();
        alert(`Switched to ${owner}'s YouTube API`);
    }
}

function switchToApifyAPI(owner) {
    const savedAPIs = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
    const token = savedAPIs[owner];
    
    if (token) {
        localStorage.setItem('apify_token', token);
        localStorage.setItem('current_apify_owner', owner);
        loadDataForCurrentKey();
        alert(`Switched to ${owner}'s Apify API`);
    }
}

// This function is no longer needed - using saveYouTubeAPI instead
// function saveApiKey() { ... }

// This function is no longer needed - using saveYouTubeAPI instead
// async function testApiKey(key, owner) { ... }

// These functions are no longer needed - using the new API management system
// function loadApiKey() { ... }
// function loadApifyToken() { ... }

function testAndSaveApifyToken() {
    const token = document.getElementById('apifyToken').value.trim();
    const owner = document.getElementById('apifyTokenOwner').value.trim();
    
    if (!token || token === '••••••••••••••••') {
        alert('Please enter a valid Apify token');
        return;
    }
    if (!owner) {
        alert('Please enter owner name');
        return;
    }
    
    document.getElementById('apifyStatus').innerHTML = '<span style="color: orange;">🔄 Testing token...</span>';
    
    fetch('https://api.apify.com/v2/users/me', {
        headers: { 'Authorization': 'Bearer ' + token.trim() }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        // Save with owner name
        const savedTokens = JSON.parse(localStorage.getItem('saved_apify_tokens') || '{}');
        savedTokens[owner] = token;
        localStorage.setItem('saved_apify_tokens', JSON.stringify(savedTokens));
        
        localStorage.setItem('apify_token', token);
        localStorage.setItem('current_apify_owner', owner);
        document.getElementById('apifyToken').value = '';
        document.getElementById('apifyTokenOwner').value = '';
        document.getElementById('apifyStatus').innerHTML = '<span style="color: green;">✅ Token validated and saved</span>';
        document.getElementById('testApifyBtn').style.display = 'inline-flex';
        renderSavedKeys();
        loadDataForCurrentKey();
    })
    .catch(error => {
        document.getElementById('apifyStatus').innerHTML = `<span style="color: red;">❌ Invalid token: ${error.message}</span>`;
    });
}

function loadDataForCurrentKey() {
    const currentYouTubeOwner = localStorage.getItem('current_youtube_owner');
    const currentApifyOwner = localStorage.getItem('current_apify_owner');
    
    // Load data associated with current API owners
    const allData = JSON.parse(localStorage.getItem('api_owner_data') || '{}');
    
    let combinedData = [];
    
    // If no specific owner is set, try to load from 'Default'
    const ytOwner = currentYouTubeOwner || 'Default';
    const apifyOwner = currentApifyOwner || 'Default';
    
    if (allData[ytOwner]) {
        const youtubeData = allData[ytOwner].filter(item => item.platform && item.platform.includes('youtube'));
        combinedData = [...combinedData, ...youtubeData];
    }
    
    if (allData[apifyOwner]) {
        const instagramData = allData[apifyOwner].filter(item => item.platform === 'instagram');
        combinedData = [...combinedData, ...instagramData];
    }
    
    // If still no data, check all owners for any data
    if (combinedData.length === 0) {
        Object.keys(allData).forEach(owner => {
            combinedData = [...combinedData, ...allData[owner]];
        });
    }
    
    trackedItems = combinedData;
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    renderTrackedItems();
}

function updateApiStatus(isValid, errorMsg = '') {
    const status = document.getElementById('apiStatus');
    if (!status) return; // Guard against null element
    
    if (isValid) {
        updateQuotaDisplay();
    } else {
        status.innerHTML = `<span style="color: red;"><i class="fas fa-times"></i> ${errorMsg || 'API Key Required'}</span>`;
    }
}

function updateQuotaUsage(cost) {
    const today = new Date().toDateString();
    if (quotaResetTime !== today) {
        quotaUsed = 0;
        quotaResetTime = today;
        localStorage.setItem('youtube_quota_reset', quotaResetTime);
    }
    quotaUsed += cost;
    localStorage.setItem('youtube_quota_used', quotaUsed.toString());
    updateQuotaDisplay();
}

function updateQuotaDisplay() {
    const today = new Date().toDateString();
    if (quotaResetTime !== today) {
        quotaUsed = 0;
        quotaResetTime = today;
        localStorage.setItem('youtube_quota_used', '0');
        localStorage.setItem('youtube_quota_reset', quotaResetTime);
    }
    
    const percentage = (quotaUsed / 10000) * 100;
    
    // Update API status
    const status = document.getElementById('apiStatus');
    if (status) {
        status.innerHTML = `<span style="color: green;"><i class="fas fa-check"></i> API Key Valid</span>`;
    }
    
    // Update quota display
    const quotaText = document.querySelector('.quota-text');
    const quotaFill = document.querySelector('.youtube-section .quota-fill');
    const resetBtn = document.getElementById('resetQuotaBtn');
    
    if (quotaText) {
        quotaText.textContent = `${quotaUsed.toLocaleString()} / 10,000 (${percentage.toFixed(1)}%)`;
    }
    
    if (quotaFill) {
        quotaFill.style.width = Math.min(percentage, 100) + '%';
    }
    
    if (resetBtn) {
        resetBtn.style.display = quotaUsed > 0 ? 'inline-block' : 'none';
    }
}

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function scrapeYouTubeData(videoId) {
    const apiKey = localStorage.getItem('youtube_api_key');
    if (!apiKey) {
        throw new Error('YouTube API key required. Please add your API key first.');
    }
    
    try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        updateQuotaUsage(1);
        
        if (data.error) {
            if (data.error.code === 403) {
                throw new Error('API quota exceeded or invalid key');
            }
            throw new Error(data.error.message);
        }
        
        if (!data.items || data.items.length === 0) {
            throw new Error('Video not found or private');
        }
        
        const video = data.items[0];
        const stats = video.statistics;
        const snippet = video.snippet;
        
        return {
            views: stats.viewCount ? parseInt(stats.viewCount).toLocaleString() : 'N/A',
            likes: stats.likeCount ? parseInt(stats.likeCount).toLocaleString() : 'N/A',
            comments: stats.commentCount ? parseInt(stats.commentCount).toLocaleString() : 'N/A',
            title: snippet.title || 'YouTube Video',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('YouTube API error:', error);
        throw error;
    }
}

function switchPlatform(platform) {
    document.querySelectorAll('.platform-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.platform-form').forEach(form => form.classList.remove('active'));
    
    document.querySelector(`[onclick="switchPlatform('${platform}')"]`).classList.add('active');
    document.getElementById(`${platform}-form`).classList.add('active');
}

async function fetchYouTubeTitle() {
    const url = document.getElementById('youtubeUrl').value.trim();
    if (!url) return;
    
    const videoId = extractVideoId(url);
    if (!videoId) return;
    
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await fetch(oembedUrl);
        const data = await response.json();
        document.getElementById('youtubeTitle').value = data.title || 'Unknown Title';
    } catch (error) {
        document.getElementById('youtubeTitle').value = 'Could not fetch title';
    }
}

async function fetchInstagramTitle() {
    const url = document.getElementById('instagramUrl').value.trim();
    if (!url) return;
    
    const postId = url.split('/p/')[1]?.split('/')[0] || url.split('/reel/')[1]?.split('/')[0] || url.split('/').pop().split('?')[0];
    document.getElementById('instagramTitle').value = `Instagram Post ${postId}`;
}

async function addYouTubeContent() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) {
        alert('Please enter your name first');
        return;
    }
    
    const apiOwner = localStorage.getItem('current_youtube_owner') || 'Default';
    
    let apiKey = localStorage.getItem('youtube_api_key');
    
    // If no API key, try to auto-load from saved APIs
    if (!apiKey) {
        const youtubeAPIs = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
        const owners = Object.keys(youtubeAPIs);
        if (owners.length > 0) {
            const firstOwner = owners[0];
            apiKey = youtubeAPIs[firstOwner];
            localStorage.setItem('youtube_api_key', apiKey);
            localStorage.setItem('current_youtube_owner', firstOwner);
        } else {
            alert('Please add your YouTube API key first');
            return;
        }
    }
    
    // Ensure current owner is set
    if (!localStorage.getItem('current_youtube_owner')) {
        const youtubeAPIs = JSON.parse(localStorage.getItem('saved_youtube_apis') || '{}');
        const owners = Object.keys(youtubeAPIs);
        if (owners.length > 0) {
            localStorage.setItem('current_youtube_owner', owners[0]);
        }
    }
    
    const urls = document.getElementById('youtubeUrl').value.trim().split('\n').filter(url => url.trim());
    const interval = parseInt(document.getElementById('youtubeInterval').value);

    if (urls.length === 0) {
        alert('Please enter at least one YouTube URL');
        return;
    }

    for (const url of urls) {
        const cleanUrl = url.trim();
        if (!cleanUrl) continue;
        
        const videoId = extractVideoId(cleanUrl);
        if (!videoId) {
            alert(`Invalid YouTube URL: ${cleanUrl}`);
            continue;
        }

        try {
            const videoData = await scrapeYouTubeData(videoId);
            
            const item = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                url: cleanUrl,
                name: videoData.title,
                platform: cleanUrl.includes('/shorts/') ? 'youtube-shorts' : 'youtube',
                interval: interval,
                data: [videoData],
                isTracking: false,
                videoId: videoId,
                userName: userName,
                apiOwner: apiOwner
            };

            trackedItems.push(item);
            startTracking(item.id);
        } catch (error) {
            alert(`Error adding ${cleanUrl}: ${error.message}`);
        }
    }
    
    // Save to both current and key-specific storage
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    saveDataForCurrentKey();
    document.getElementById('youtubeUrl').value = '';
    document.getElementById('youtubeTitle').value = '';
    renderTrackedItems();
}

async function addInstagramContent() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) {
        alert('Please enter your name first');
        return;
    }
    
    const apiOwner = localStorage.getItem('current_apify_owner') || 'Default';
    
    let token = localStorage.getItem('apify_token');
    
    // If no token, try to auto-load from saved APIs
    if (!token) {
        const apifyAPIs = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
        const owners = Object.keys(apifyAPIs);
        if (owners.length > 0) {
            const firstOwner = owners[0];
            token = apifyAPIs[firstOwner];
            localStorage.setItem('apify_token', token);
            localStorage.setItem('current_apify_owner', firstOwner);
        } else {
            alert('Please add your Apify API token first');
            return;
        }
    }
    
    // Ensure current owner is set
    if (!localStorage.getItem('current_apify_owner')) {
        const apifyAPIs = JSON.parse(localStorage.getItem('saved_apify_apis') || '{}');
        const owners = Object.keys(apifyAPIs);
        if (owners.length > 0) {
            localStorage.setItem('current_apify_owner', owners[0]);
        }
    }
    
    const urls = document.getElementById('instagramUrl').value.trim().split('\n').filter(url => url.trim());
    const interval = parseInt(document.getElementById('instagramInterval').value);

    if (urls.length === 0) {
        alert('Please enter at least one Instagram URL');
        return;
    }

    for (const url of urls) {
        const cleanUrl = url.trim();
        if (!cleanUrl) continue;
        
        if (!cleanUrl.includes('instagram.com')) {
            alert(`Invalid Instagram URL: ${cleanUrl}`);
            continue;
        }

        const postId = cleanUrl.split('/p/')[1]?.split('/')[0] || cleanUrl.split('/reel/')[1]?.split('/')[0] || cleanUrl.split('/').pop().split('?')[0];
        
        if (!token) {
            alert('Please add your Apify API token first to track Instagram posts');
            continue;
        }
        
        try {
            const initialData = await scrapeInstagramWithApify(cleanUrl, token);
            
            const item = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                url: cleanUrl,
                name: `Instagram Post ${postId}`,
                platform: 'instagram',
                interval: interval,
                data: [initialData],
                isTracking: false,
                postId: postId,
                userName: userName,
                apiOwner: apiOwner
            };
            
            trackedItems.push(item);
            startTracking(item.id);
        } catch (error) {
            alert(`Error adding ${cleanUrl}: ${error.message}`);
        }


    }
    
    // Save to both current and key-specific storage
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    saveDataForCurrentKey();
    document.getElementById('instagramUrl').value = '';
    document.getElementById('instagramTitle').value = '';
    renderTrackedItems();
}

function saveDataForCurrentKey() {
    const currentYouTubeOwner = localStorage.getItem('current_youtube_owner');
    const currentApifyOwner = localStorage.getItem('current_apify_owner');
    
    const allData = JSON.parse(localStorage.getItem('api_owner_data') || '{}');
    
    // Save data by API owner name
    trackedItems.forEach(item => {
        const owner = item.apiOwner;
        if (owner) {
            if (!allData[owner]) allData[owner] = [];
            
            // Remove existing item and add updated one
            allData[owner] = allData[owner].filter(existing => existing.id !== item.id);
            allData[owner].push(item);
        }
    });
    
    localStorage.setItem('api_owner_data', JSON.stringify(allData));
}

async function updateItemData(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item) return;

    try {
        let newData = null;
        
        if (item.platform.includes('youtube')) {
            newData = await scrapeYouTubeData(item.videoId);
        } else if (item.platform === 'instagram') {
            const token = localStorage.getItem('apify_token');
            if (!token) {
                throw new Error('Apify token required for Instagram tracking');
            }
            newData = await scrapeInstagramWithApify(item.url, token);
        }

        if (newData) {
            item.data.push(newData);
            if (item.data.length > 100) item.data.shift();
            localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
            if (googleSheetUrl) syncToGoogleSheets();
            renderTrackedItems();
        }
    } catch (error) {
        console.error(`Failed to update data for ${item.name}:`, error.message);
    }
}

function startTracking(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item || item.isTracking) return;

    item.isTracking = true;
    
    trackingIntervals[itemId] = setInterval(async () => {
        try {
            await updateItemData(itemId);
        } catch (error) {
            console.error(`Auto-fetch failed for ${item.name}:`, error.message);
        }
    }, item.interval);

    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    renderTrackedItems();
    updateStatus();
}

function stopTracking(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item || !item.isTracking) return;

    item.isTracking = false;
    clearInterval(trackingIntervals[itemId]);
    delete trackingIntervals[itemId];

    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    renderTrackedItems();
    updateStatus();
}

function clearItemData(itemId) {
    if (confirm('Clear all data for this item? This will keep the item but remove all tracking history.')) {
        const item = trackedItems.find(i => i.id === itemId);
        if (item) {
            item.data = [];
            localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
            renderTrackedItems();
        }
    }
}

function clearAllData() {
    if (confirm('Clear all tracking data? This will remove all items and their data.')) {
        stopAllTracking();
        trackedItems = [];
        localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
        renderTrackedItems();
        updateStatus();
    }
}

function deleteItem(itemId) {
    if (confirm('Are you sure you want to delete this item?')) {
        stopTracking(itemId);
        trackedItems = trackedItems.filter(i => i.id !== itemId);
        localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
        renderTrackedItems();
        updateStatus();
    }
}

function startAllTracking() {
    trackedItems.forEach(item => {
        if (!item.isTracking) startTracking(item.id);
    });
}

function stopAllTracking() {
    trackedItems.forEach(item => {
        if (item.isTracking) stopTracking(item.id);
    });
}

function refreshAll() {
    trackedItems.forEach(item => {
        updateItemData(item.id);
    });
}

function exportData() {
    const dataStr = JSON.stringify(trackedItems, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `social-media-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function updateStatus() {
    const activeCount = trackedItems.filter(i => i.isTracking).length;
    document.getElementById('trackingStatus').textContent = 
        activeCount > 0 ? `Tracking ${activeCount} items` : 'Ready to track';
    document.getElementById('activeTrackers').textContent = `${activeCount} active trackers`;
}

let currentFilter = 'all';
let currentUserFilter = 'all';

function filterContent(filter) {
    currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[onclick="filterContent('${filter}')"]`).classList.add('active');
    
    renderTrackedItems();
}

function filterByUser() {
    const userSelect = document.getElementById('userFilter');
    currentUserFilter = userSelect.value;
    renderTrackedItems();
}

function updateUserFilter() {
    const userSelect = document.getElementById('userFilter');
    const currentValue = userSelect.value;
    
    // Get unique usernames
    const users = [...new Set(trackedItems.map(item => item.userName).filter(Boolean))];
    
    // Clear and rebuild options
    userSelect.innerHTML = '<option value="all">All Users</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        if (user === currentValue) option.selected = true;
        userSelect.appendChild(option);
    });
    
    // Reset to 'all' if current user no longer exists
    if (currentValue !== 'all' && !users.includes(currentValue)) {
        currentUserFilter = 'all';
        userSelect.value = 'all';
    }
}

function renderTrackedItems() {
    const container = document.getElementById('trackedContent');
    
    // Update user filter dropdown
    updateUserFilter();
    
    if (trackedItems.length === 0) {
        container.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-chart-area"></i>
                <h3>No Content Being Tracked</h3>
                <p>Add YouTube videos/shorts or Instagram posts to start tracking</p>
            </div>
        `;
        return;
    }

    // Filter items based on current filters
    let filteredItems = trackedItems;
    
    // Platform filter
    if (currentFilter === 'youtube') {
        filteredItems = filteredItems.filter(item => item.platform.includes('youtube'));
    } else if (currentFilter === 'instagram') {
        filteredItems = filteredItems.filter(item => item.platform === 'instagram');
    }
    
    // User filter
    if (currentUserFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.userName === currentUserFilter);
    }
    
    if (filteredItems.length === 0) {
        const filterText = currentUserFilter !== 'all' ? `for user "${currentUserFilter}"` : '';
        const platformText = currentFilter !== 'all' ? currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1) : '';
        container.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-filter"></i>
                <h3>No ${platformText} Content ${filterText}</h3>
                <p>No items match the current filters</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredItems.map(item => renderItem(item)).join('');
}

function renderItem(item) {
    const latestData = item.data[item.data.length - 1];
    const platformClass = item.platform.includes('youtube') ? 'youtube' : 'instagram';
    const platformIcon = item.platform.includes('youtube') ? 'fab fa-youtube' : 'fab fa-instagram';
    
    return `
        <div class="tracked-item">
            <div class="item-header">
                <div>
                    <span class="tracking-indicator ${item.isTracking ? 'tracking-active' : 'tracking-inactive'}"></span>
                    <span class="item-title">${item.name || 'Untitled'}</span>
                    <span class="item-platform ${platformClass}">
                        <i class="${platformIcon}"></i>
                        ${item.platform.toUpperCase()}
                    </span>
                    <span class="user-badge ${!item.userName || item.userName === 'Unknown' ? 'editable' : ''}" onclick="${!item.userName || item.userName === 'Unknown' ? `editUserName('${item.id}')` : ''}">
                        <i class="fas fa-user"></i>
                        ${item.userName || 'Unknown'}
                    </span>
                    <span class="api-badge ${!item.apiOwner || item.apiOwner === 'Default' || item.apiOwner === 'Unknown' ? 'editable' : ''}" onclick="${!item.apiOwner || item.apiOwner === 'Default' || item.apiOwner === 'Unknown' ? `editApiOwner('${item.id}')` : ''}">
                        ${item.apiOwner || item.apiKey || 'Default'}
                    </span>
                </div>
                <div class="item-controls">
                    ${!item.isTracking ? 
                        `<button class="btn btn-success" onclick="startTracking('${item.id}')">
                            <i class="fas fa-play"></i>
                        </button>` :
                        `<button class="btn btn-danger" onclick="stopTracking('${item.id}')">
                            <i class="fas fa-stop"></i>
                        </button>`
                    }
                    <button class="btn btn-secondary" onclick="updateItemData('${item.id}')">
                        <i class="fas fa-refresh"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="showDataTable('${item.id}')">
                        <i class="fas fa-table"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="showDataChart('${item.id}')">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="editInterval('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="editApiOwner('${item.id}')">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="clearItemData('${item.id}')">
                        <i class="fas fa-broom"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            ${latestData ? `
                <div class="modern-stats">
                    ${item.platform.includes('youtube') ? `
                        <div class="stat-card views">
                            <div class="stat-icon">👁️</div>
                            <div class="stat-content">
                                <div class="stat-number">${latestData.views}</div>
                                <div class="stat-text">Views</div>
                            </div>
                        </div>
                        <div class="stat-card likes">
                            <div class="stat-icon">👍</div>
                            <div class="stat-content">
                                <div class="stat-number">${latestData.likes}</div>
                                <div class="stat-text">Likes</div>
                            </div>
                        </div>
                        <div class="stat-card comments">
                            <div class="stat-icon">💬</div>
                            <div class="stat-content">
                                <div class="stat-number">${latestData.comments || 'N/A'}</div>
                                <div class="stat-text">Comments</div>
                            </div>
                        </div>
                    ` : `
                        <div class="stat-card likes ig-likes">
                            <div class="stat-icon">❤️</div>
                            <div class="stat-content">
                                <div class="stat-number">${latestData.likes}</div>
                                <div class="stat-text">Likes</div>
                            </div>
                        </div>
                        <div class="stat-card comments ig-comments">
                            <div class="stat-icon">💬</div>
                            <div class="stat-content">
                                <div class="stat-number">${latestData.comments}</div>
                                <div class="stat-text">Comments</div>
                            </div>
                        </div>
                        ${latestData.shares && latestData.shares > 0 ? `<div class="stat-card shares ig-shares">
                            <div class="stat-icon">📤</div>
                            <div class="stat-content">
                                <div class="stat-number">${latestData.shares.toLocaleString()}</div>
                                <div class="stat-text">Shares</div>
                            </div>
                        </div>` : ''}
                    `}
                    <div class="stat-card data-points">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-number">${item.data.length}</div>
                            <div class="stat-text">Points</div>
                        </div>
                    </div>
                    <div class="stat-card last-update">
                        <div class="stat-icon">🕒</div>
                        <div class="stat-content">
                            <div class="stat-number">${new Date(latestData.timestamp).toLocaleTimeString()}</div>
                            <div class="stat-text">Updated</div>
                        </div>
                    </div>
                    <div class="stat-card interval">
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-content">
                            <div class="stat-number">${Math.round(item.interval/60000)}m</div>
                            <div class="stat-text">Interval</div>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="loading-stats">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Fetching current data...</p>
                </div>
            `}
        </div>
    `;
}

function resetQuota() {
    if (confirm('Reset quota counter? This is for testing purposes only.')) {
        quotaUsed = 0;
        quotaResetTime = new Date().toDateString();
        localStorage.setItem('youtube_quota_used', '0');
        localStorage.setItem('youtube_quota_reset', quotaResetTime);
        updateQuotaDisplay();
        alert('Quota counter reset successfully!');
    }
}

function updateInstagramQuotaUsage(cost) {
    const today = new Date().toDateString();
    if (instagramQuotaResetTime !== today) {
        instagramQuotaUsed = 0;
        instagramQuotaResetTime = today;
        localStorage.setItem('instagram_quota_reset', instagramQuotaResetTime);
    }
    instagramQuotaUsed += cost;
    localStorage.setItem('instagram_quota_used', instagramQuotaUsed.toFixed(2));
    updateInstagramQuotaDisplay();
}

function updateInstagramQuotaDisplay() {
    const today = new Date().toDateString();
    if (instagramQuotaResetTime !== today) {
        instagramQuotaUsed = 0;
        instagramQuotaResetTime = today;
        localStorage.setItem('instagram_quota_used', '0.00');
        localStorage.setItem('instagram_quota_reset', instagramQuotaResetTime);
    }
    
    const percentage = (instagramQuotaUsed / instagramQuotaLimit) * 100;
    
    const quotaText = document.querySelector('.instagram-quota-text');
    const quotaFill = document.querySelector('.instagram-quota-fill');
    
    if (quotaText) {
        quotaText.textContent = `$${instagramQuotaUsed.toFixed(2)} / $${instagramQuotaLimit.toFixed(2)} (${percentage.toFixed(1)}%)`;
    }
    
    if (quotaFill) {
        quotaFill.style.width = Math.min(percentage, 100) + '%';
    }
}

function updateUrlCounter(textareaId, counterId) {
    const textarea = document.getElementById(textareaId);
    const counter = document.getElementById(counterId);
    const urls = textarea.value.trim().split('\n').filter(url => url.trim()).length;
    counter.textContent = `${urls} URL${urls !== 1 ? 's' : ''}`;
}

async function scrapeInstagramWithApify(url, token) {
    // Update Instagram quota usage
    updateInstagramQuotaUsage(0.01); // $0.01 per post scrape
    
    const runResponse = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            directUrls: [url],
            resultsType: 'posts',
            resultsLimit: 1
        })
    });

    if (!runResponse.ok) {
        throw new Error('Failed to start Apify actor');
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;

    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30;
    
    while (status === 'RUNNING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusResponse = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs/${runId}?token=${token}`);
        const statusData = await statusResponse.json();
        status = statusData.data.status;
        attempts++;
    }

    if (status !== 'SUCCEEDED') {
        throw new Error(`Apify actor ${status.toLowerCase()}`);
    }

    const runInfo = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs/${runId}?token=${token}`);
    const runInfoData = await runInfo.json();
    const datasetId = runInfoData.data.defaultDatasetId;
    
    const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?format=json`);
    const results = await resultsResponse.json();
    
    if (!results || results.length === 0) {
        throw new Error('No data returned from Instagram post');
    }
    
    const item = results[0];
    return {
        likes: (item.likesCount || item.likes || 0).toLocaleString(),
        comments: (item.commentsCount || item.comments || 0).toLocaleString(),
        shares: item.sharesCount || item.shares || item.shareCount || item.sharesTotal || null,
        timestamp: new Date().toISOString()
    };
}

async function testAndSaveApifyToken() {
    const token = document.getElementById('apifyToken').value.trim();
    if (!token || token === '••••••••••••••••') {
        alert('Please enter a valid Apify token');
        return;
    }
    
    document.getElementById('apifyStatus').innerHTML = '<span style="color: orange;">🔄 Testing token...</span>';
    
    try {
        const response = await fetch('https://api.apify.com/v2/users/me', {
            headers: { 'Authorization': 'Bearer ' + token.trim() }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        // Save to multiple tokens storage
        const tokens = JSON.parse(localStorage.getItem('apify_tokens') || '{}');
        const tokenId = token.slice(-8);
        tokens[tokenId] = token;
        localStorage.setItem('apify_tokens', JSON.stringify(tokens));
        
        localStorage.setItem('apify_token', token);
        document.getElementById('apifyToken').value = '••••••••••••••••';
        document.getElementById('apifyStatus').innerHTML = '<span style="color: green;">✅ Token validated and saved</span>';
        document.getElementById('testApifyBtn').style.display = 'inline-flex';
        loadDataForCurrentKey();
    } catch (error) {
        document.getElementById('apifyStatus').innerHTML = `<span style="color: red;">❌ Invalid token: ${error.message}</span>`;
    }
}

function testApifyExtractor() {
    document.getElementById('apifyStatus').innerHTML = '<span style="color: green;">✅ Extractor ready</span>';
}

function showDataTable(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item || item.data.length === 0) {
        alert('No data available for this item');
        return;
    }
    
    document.getElementById('modalTitle').textContent = `Data Table - ${item.name}`;
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Time</th>
                    ${item.platform.includes('youtube') ? '<th>Views</th><th>Likes</th><th>Comments</th><th>View Change</th><th>Like Change</th><th>Comment Change</th>' : '<th>Likes</th><th>Comments</th><th>Like Change</th><th>Comment Change</th>'}
                </tr>
            </thead>
            <tbody>
    `;
    
    item.data.forEach((entry, index) => {
        const prevEntry = item.data[index - 1];
        let changes = '';
        
        if (prevEntry) {
            if (item.platform.includes('youtube')) {
                const viewDiff = parseInt(entry.views?.replace(/,/g, '') || '0') - parseInt(prevEntry.views?.replace(/,/g, '') || '0');
                const likeDiff = parseInt(entry.likes?.replace(/,/g, '') || '0') - parseInt(prevEntry.likes?.replace(/,/g, '') || '0');
                const commentDiff = parseInt(entry.comments?.replace(/,/g, '') || '0') - parseInt(prevEntry.comments?.replace(/,/g, '') || '0');
                changes = `<td style="color: ${viewDiff >= 0 ? 'green' : 'red'}">+${viewDiff}</td><td style="color: ${likeDiff >= 0 ? 'green' : 'red'}">+${likeDiff}</td><td style="color: ${commentDiff >= 0 ? 'green' : 'red'}">+${commentDiff}</td>`;
            } else {
                const likeDiff = parseInt(entry.likes?.replace(/,/g, '') || '0') - parseInt(prevEntry.likes?.replace(/,/g, '') || '0');
                const commentDiff = parseInt(entry.comments?.replace(/,/g, '') || '0') - parseInt(prevEntry.comments?.replace(/,/g, '') || '0');
                changes = `<td style="color: ${likeDiff >= 0 ? 'green' : 'red'}">+${likeDiff}</td><td style="color: ${commentDiff >= 0 ? 'green' : 'red'}">+${commentDiff}</td>`;
            }
        } else {
            changes = item.platform.includes('youtube') ? '<td>-</td><td>-</td><td>-</td>' : '<td>-</td><td>-</td>';
        }
        
        tableHTML += `
            <tr>
                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                ${item.platform.includes('youtube') ? 
                    `<td>${entry.views || 'N/A'}</td><td>${entry.likes}</td><td>${entry.comments || 'N/A'}</td>${changes}` : 
                    `<td>${entry.likes}</td><td>${entry.comments}</td>${changes}`
                }
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    document.getElementById('modalBody').innerHTML = tableHTML;
    document.getElementById('dataModal').classList.add('show');
}

function showDataChart(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item || item.data.length === 0) {
        alert('No data available for this item');
        return;
    }
    
    document.getElementById('modalTitle').textContent = `Data Chart - ${item.name}`;
    document.getElementById('modalBody').innerHTML = `
        <div class="chart-tabs" style="display: flex; margin-bottom: 20px; background: rgba(240, 240, 240, 0.5); border-radius: 15px; padding: 5px;">
            <button class="chart-tab active" onclick="switchChartTab('all', '${item.id}')" style="flex: 1; padding: 12px 20px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px; font-weight: 600; cursor: pointer;">
                📊 All Metrics
            </button>
            ${item.platform.includes('youtube') ? `
                <button class="chart-tab" onclick="switchChartTab('views', '${item.id}')" style="flex: 1; padding: 12px 20px; border: none; background: none; color: #666; border-radius: 12px; font-weight: 600; cursor: pointer; margin-left: 5px;">
                    👁️ Views
                </button>
            ` : ''}
            <button class="chart-tab" onclick="switchChartTab('likes', '${item.id}')" style="flex: 1; padding: 12px 20px; border: none; background: none; color: #666; border-radius: 12px; font-weight: 600; cursor: pointer; margin-left: 5px;">
                ${item.platform.includes('youtube') ? '👍' : '❤️'} Likes
            </button>
            <button class="chart-tab" onclick="switchChartTab('comments', '${item.id}')" style="flex: 1; padding: 12px 20px; border: none; background: none; color: #666; border-radius: 12px; font-weight: 600; cursor: pointer; margin-left: 5px;">
                💬 Comments
            </button>
        </div>
        <div class="chart-container-modal"><canvas id="dataChart"></canvas></div>
    `;
    document.getElementById('dataModal').classList.add('show');
    
    window.currentChartItem = item;
    
    setTimeout(() => {
        createChart(item, 'all');
    }, 200);
}

function switchChartTab(tab, itemId) {
    document.querySelectorAll('.chart-tab').forEach(t => {
        t.style.background = 'none';
        t.style.color = '#666';
    });
    event.target.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    event.target.style.color = 'white';
    
    const item = trackedItems.find(i => i.id === itemId);
    if (item) {
        createChart(item, tab);
    }
}

function createChart(item, tab) {
    const canvas = document.getElementById('dataChart');
    const ctx = canvas.getContext('2d');
    
    if (window.currentChart) {
        window.currentChart.destroy();
    }
    
    const labels = item.data.map(d => new Date(d.timestamp).toLocaleTimeString());
    const datasets = [];
    
    if (tab === 'all') {
        if (item.platform.includes('youtube')) {
            datasets.push(
                {
                    label: 'Views',
                    data: item.data.map(d => parseInt(d.views?.replace(/,/g, '') || '0') || 0),
                    borderColor: '#ff4757',
                    backgroundColor: 'rgba(255, 71, 87, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Likes',
                    data: item.data.map(d => parseInt(d.likes?.replace(/,/g, '') || '0') || 0),
                    borderColor: '#2ed573',
                    backgroundColor: 'rgba(46, 213, 115, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Comments',
                    data: item.data.map(d => parseInt(d.comments?.replace(/,/g, '') || '0') || 0),
                    borderColor: '#3742fa',
                    backgroundColor: 'rgba(55, 66, 250, 0.1)',
                    tension: 0.4
                }
            );
        } else {
            datasets.push(
                {
                    label: 'Likes',
                    data: item.data.map(d => parseInt(d.likes?.replace(/,/g, '') || '0') || 0),
                    borderColor: '#E4405F',
                    backgroundColor: 'rgba(228, 64, 95, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Comments',
                    data: item.data.map(d => parseInt(d.comments?.replace(/,/g, '') || '0') || 0),
                    borderColor: '#3742fa',
                    backgroundColor: 'rgba(55, 66, 250, 0.1)',
                    tension: 0.4
                }
            );
        }
    } else if (tab === 'views' && item.platform.includes('youtube')) {
        datasets.push({
            label: 'Views',
            data: item.data.map(d => parseInt(d.views?.replace(/,/g, '') || '0') || 0),
            borderColor: '#ff4757',
            backgroundColor: 'rgba(255, 71, 87, 0.2)',
            tension: 0.4,
            fill: true
        });
    } else if (tab === 'likes') {
        datasets.push({
            label: 'Likes',
            data: item.data.map(d => parseInt(d.likes?.replace(/,/g, '') || '0') || 0),
            borderColor: item.platform.includes('youtube') ? '#2ed573' : '#E4405F',
            backgroundColor: item.platform.includes('youtube') ? 'rgba(46, 213, 115, 0.2)' : 'rgba(228, 64, 95, 0.2)',
            tension: 0.4,
            fill: true
        });
    } else if (tab === 'comments') {
        datasets.push({
            label: 'Comments',
            data: item.data.map(d => parseInt(d.comments?.replace(/,/g, '') || '0') || 0),
            borderColor: '#3742fa',
            backgroundColor: 'rgba(55, 66, 250, 0.2)',
            tension: 0.4,
            fill: true
        });
    }
    
    window.currentChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.08)'
                    }
                },
                y: {
                    beginAtZero: false,
                    display: true,
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.08)'
                    },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) {
                                return (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                            }
                            return Math.round(value);
                        }
                    },
                    afterDataLimits: function(scale) {
                        const allData = [];
                        scale.chart.data.datasets.forEach(dataset => {
                            allData.push(...dataset.data);
                        });
                        
                        const min = Math.min(...allData);
                        const max = Math.max(...allData);
                        const range = max - min;
                        
                        if (range === 0) {
                            scale.min = min - 1;
                            scale.max = max + 1;
                        } else if (range <= 10) {
                            scale.min = min - 1;
                            scale.max = max + 1;
                        } else {
                            const padding = Math.min(range * 0.02, 20);
                            scale.min = min - padding;
                            scale.max = max + padding;
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 6,
                    hoverRadius: 10,
                    hitRadius: 15,
                    borderWidth: 2,
                    backgroundColor: 'white'
                },
                line: {
                    borderWidth: 3,
                    tension: 0
                }
            }
        }
    });
}

function editInterval(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('modalTitle').textContent = `Edit Interval - ${item.name}`;
    document.getElementById('modalBody').innerHTML = `
        <div style="margin-bottom: 20px;">
            <label>Update Interval:</label>
            <select id="newInterval" style="width: 100%; padding: 10px; margin-top: 10px;">
                <option value="60000" ${item.interval === 60000 ? 'selected' : ''}>Every 1 Minute</option>
                <option value="300000" ${item.interval === 300000 ? 'selected' : ''}>Every 5 Minutes</option>
                <option value="900000" ${item.interval === 900000 ? 'selected' : ''}>Every 15 Minutes</option>
                <option value="1800000" ${item.interval === 1800000 ? 'selected' : ''}>Every 30 Minutes</option>
                <option value="3600000" ${item.interval === 3600000 ? 'selected' : ''}>Every Hour</option>
                <option value="21600000" ${item.interval === 21600000 ? 'selected' : ''}>Every 6 Hours</option>
                <option value="86400000" ${item.interval === 86400000 ? 'selected' : ''}>Every 24 Hours</option>
            </select>
            <button class="btn btn-primary" onclick="updateInterval('${itemId}')" style="margin-top: 15px;">
                <i class="fas fa-save"></i> Update
            </button>
        </div>
        <p style="color: #666;">Current interval: ${Math.round(item.interval/60000)} minutes</p>
    `;
    document.getElementById('dataModal').classList.add('show');
}

function updateInterval(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    const newInterval = parseInt(document.getElementById('newInterval').value);
    
    if (!item || !newInterval) return;
    
    const wasTracking = item.isTracking;
    
    if (wasTracking) {
        stopTracking(itemId);
    }
    
    item.interval = newInterval;
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    
    if (wasTracking) {
        startTracking(itemId);
    }
    
    closeModal();
    renderTrackedItems();
    alert(`Interval updated to ${Math.round(newInterval/60000)} minutes`);
}

function editApiOwner(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('modalTitle').textContent = `Edit API Owner - ${item.name}`;
    document.getElementById('modalBody').innerHTML = `
        <div style="margin-bottom: 20px;">
            <label>API Owner:</label>
            <input type="text" id="newApiOwner" value="${item.apiOwner || item.apiKey || 'Default'}" style="width: 100%; padding: 10px; margin-top: 10px;" placeholder="Enter API owner name" />
            <button class="btn btn-primary" onclick="updateApiOwner('${itemId}')" style="margin-top: 15px;">
                <i class="fas fa-save"></i> Update
            </button>
        </div>
        <p style="color: #666;">Current API owner: ${item.apiOwner || item.apiKey || 'Default'}</p>
    `;
    document.getElementById('dataModal').classList.add('show');
}

function updateApiOwner(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    const newApiOwner = document.getElementById('newApiOwner').value.trim() || 'Default';
    
    if (!item) return;
    
    item.apiOwner = newApiOwner;
    if (item.apiKey) delete item.apiKey; // Remove old apiKey field
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    
    closeModal();
    renderTrackedItems();
    alert(`API owner updated to: ${newApiOwner}`);
}

function editUserName(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('modalTitle').textContent = `Edit User Name - ${item.name}`;
    document.getElementById('modalBody').innerHTML = `
        <div style="margin-bottom: 20px;">
            <label>User Name:</label>
            <input type="text" id="newUserName" value="${item.userName || ''}" style="width: 100%; padding: 10px; margin-top: 10px;" placeholder="Enter user name" />
            <button class="btn btn-primary" onclick="updateUserName('${itemId}')" style="margin-top: 15px;">
                <i class="fas fa-save"></i> Update
            </button>
        </div>
        <p style="color: #666;">Current user: ${item.userName || 'Unknown'}</p>
    `;
    document.getElementById('dataModal').classList.add('show');
}

function updateUserName(itemId) {
    const item = trackedItems.find(i => i.id === itemId);
    const newUserName = document.getElementById('newUserName').value.trim();
    
    if (!item || !newUserName) return;
    
    item.userName = newUserName;
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    
    closeModal();
    renderTrackedItems();
    alert(`User name updated to: ${newUserName}`);
}

function closeModal() {
    if (window.currentChart) {
        window.currentChart.destroy();
        window.currentChart = null;
    }
    document.getElementById('dataModal').classList.remove('show');
}

// This is now handled in the main DOMContentLoaded event listener

// Initialize Apify status on page load
function initializeApifyStatus() {
    const apifyStatus = document.getElementById('apifyStatus');
    if (!apifyStatus) return;
    
    const savedApifyToken = localStorage.getItem('apify_token');
    if (savedApifyToken) {
        apifyStatus.innerHTML = '<span style="color: green;">✅ Token configured</span>';
    } else {
        apifyStatus.innerHTML = '<span style="color: #666;">🔑 Apify token required for Instagram tracking</span>';
    }
}

// Call initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApifyStatus();
});

// Google Sheets Integration Functions
function saveGoogleSheetUrl() {
    const url = document.getElementById('googleSheetUrl').value.trim();
    if (!url) {
        alert('Please enter a Google Sheet URL');
        return;
    }
    
    if (!url.includes('docs.google.com/spreadsheets')) {
        alert('Please enter a valid Google Sheets URL');
        return;
    }
    
    googleSheetUrl = url;
    localStorage.setItem('google_sheet_url', url);
    extractSheetId(url);
    
    document.getElementById('sheetsStatus').innerHTML = '<span style="color: green;">✅ Google Sheet URL saved</span>';
    
    // Initial sync to Google Sheets
    syncToGoogleSheets();
}

function extractSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
        googleSheetId = match[1];
    }
}

async function syncToGoogleSheets() {
    if (!googleSheetUrl || !googleSheetId) {
        alert('Please save a Google Sheet URL first');
        return;
    }
    
    document.getElementById('sheetsStatus').innerHTML = '<span style="color: blue;">🔄 Syncing to Google Sheets...</span>';
    
    try {
        // Convert trackedItems to sheet format
        const sheetData = convertToSheetFormat(trackedItems);
        
        // Use Google Apps Script Web App to write data
        const response = await fetch(`https://script.google.com/macros/s/AKfycby8qiIQTpEog630AOvYj0Jnx9KGCdlbGAYxVxzN3aSDb0-0F7HprTEoSJxYY8sZTSowjQ/exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'writeData',
                sheetId: googleSheetId,
                data: sheetData
            })
        });
        
        if (response.ok) {
            document.getElementById('sheetsStatus').innerHTML = '<span style="color: green;">✅ Data synced to Google Sheets</span>';
        } else {
            throw new Error('Failed to sync');
        }
    } catch (error) {
        console.error('Google Sheets sync error:', error);
        document.getElementById('sheetsStatus').innerHTML = '<span style="color: red;">❌ Sync failed - using local storage</span>';
        localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    }
}

async function loadFromGoogleSheets() {
    if (!googleSheetUrl || !googleSheetId) return;
    
    try {
        document.getElementById('sheetsStatus').innerHTML = '<span style="color: blue;">🔄 Loading from Google Sheets...</span>';
        
        const response = await fetch(`https://script.google.com/macros/s/AKfycby8qiIQTpEog630AOvYj0Jnx9KGCdlbGAYxVxzN3aSDb0-0F7HprTEoSJxYY8sZTSowjQ/exec?action=readData&sheetId=${googleSheetId}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                trackedItems = convertFromSheetFormat(data);
                document.getElementById('sheetsStatus').innerHTML = '<span style="color: green;">✅ Data loaded from Google Sheets</span>';
            }
        }
    } catch (error) {
        console.error('Google Sheets load error:', error);
        document.getElementById('sheetsStatus').innerHTML = '<span style="color: orange;">⚠️ Using local data</span>';
        const local = localStorage.getItem('trackedItems');
        trackedItems = local ? JSON.parse(local) : [];
    }
}

function convertToSheetFormat(items) {
    const headers = ['ID', 'Name', 'URL', 'Platform', 'User', 'API Owner', 'Interval', 'Is Tracking', 'Latest Views', 'Latest Likes', 'Latest Comments', 'Last Updated', 'Data Points'];
    const rows = [headers];
    
    items.forEach(item => {
        const latest = item.data[item.data.length - 1] || {};
        rows.push([
            item.id,
            item.name || '',
            item.url || '',
            item.platform || '',
            item.userName || '',
            item.apiOwner || '',
            item.interval || 0,
            item.isTracking ? 'TRUE' : 'FALSE',
            latest.views || '',
            latest.likes || '',
            latest.comments || '',
            latest.timestamp || '',
            item.data.length
        ]);
    });
    
    return rows;
}

function convertFromSheetFormat(sheetData) {
    if (!sheetData || sheetData.length < 2) return [];
    
    const items = [];
    const headers = sheetData[0];
    
    for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row[0]) continue; // Skip empty rows
        
        const item = {
            id: row[0],
            name: row[1] || '',
            url: row[2] || '',
            platform: row[3] || '',
            userName: row[4] || '',
            apiOwner: row[5] || '',
            interval: parseInt(row[6]) || 3600000,
            isTracking: row[7] === 'TRUE',
            data: []
        };
        
        // Add latest data point if available
        if (row[8] || row[9] || row[10]) {
            item.data.push({
                views: row[8] || '',
                likes: row[9] || '',
                comments: row[10] || '',
                timestamp: row[11] || new Date().toISOString()
            });
        }
        
        items.push(item);
    }
    
    return items;
}

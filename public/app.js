// State
let currentView = 'root'; // 'root' or 'folder'
let currentFolderId = null;
let currentFolderPath = '';
let navigationStack = [];

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// Offline/Online Detection
const connectionStatus = document.getElementById('connection-status');
window.addEventListener('offline', () => {
    connectionStatus.classList.remove('hidden');
    fileList.style.opacity = '0.7';
});
window.addEventListener('online', () => {
    connectionStatus.classList.add('hidden');
    fileList.style.opacity = '1';
    // Optionally reload to sync
    if (currentView === 'root') loadRootFiles();
});

// DOM Elements
const fileList = document.getElementById('file-list');
const breadcrumb = document.getElementById('breadcrumb');
const refreshBtn = document.getElementById('refresh-btn');
const videoPlayerContainer = document.getElementById('video-player-container');
const videoPlayer = document.getElementById('video-player');
const videoTitle = document.getElementById('video-title');
const closeVideoBtn = document.getElementById('close-video');
const imageViewer = document.getElementById('image-viewer');
const imageDisplay = document.getElementById('image-display');
const closeImageBtn = document.getElementById('close-image');

// Init
loadRootFiles();

// Event Listeners
refreshBtn.addEventListener('click', () => {
    if (currentView === 'root') {
        loadRootFiles();
    } else {
        loadFolderContents(currentFolderId, currentFolderPath);
    }
});

closeVideoBtn.addEventListener('click', closeVideo);
closeImageBtn.addEventListener('click', closeImage);

// Upload Logic
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');

if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }

        // Show simplified uploading state (can improve UI later)
        // Show Progress Modal
        const progressModal = document.getElementById('upload-progress');
        const progressCircle = document.getElementById('progress-circle');
        const progressText = document.getElementById('progress-text');
        const uploadStatus = document.getElementById('upload-status');

        if (progressModal) {
            progressModal.classList.add('active');
            if (progressCircle) progressCircle.setAttribute('stroke-dasharray', `0, 100`);
            if (progressText) progressText.textContent = '0%';
            if (uploadStatus) uploadStatus.textContent = 'Sending files...';
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && progressCircle && progressText) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressCircle.setAttribute('stroke-dasharray', `${percentComplete}, 100`);
                progressText.textContent = percentComplete + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                if (uploadStatus) uploadStatus.textContent = 'Upload Complete!';
                if (progressCircle) progressCircle.setAttribute('stroke-dasharray', `100, 100`);
                if (progressText) progressText.textContent = '100%';

                setTimeout(() => {
                    if (progressModal) progressModal.classList.remove('active');
                    alert('Upload Successful! Files sent to host.');
                }, 1000);
            } else {
                if (uploadStatus) uploadStatus.textContent = 'Upload Failed.';
                setTimeout(() => {
                    if (progressModal) progressModal.classList.remove('active');
                }, 2000);
            }
            fileInput.value = ''; // reset
            uploadBtn.innerHTML = originalText;
        };

        xhr.onerror = () => {
            if (uploadStatus) uploadStatus.textContent = 'Network Error.';
            setTimeout(() => {
                if (progressModal) progressModal.classList.remove('active');
            }, 2000);
            fileInput.value = ''; // reset
            uploadBtn.innerHTML = originalText;
        };

        xhr.send(formData);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeVideo();
        closeImage();
    }
});

// Load root shared files
async function loadRootFiles() {
    currentView = 'root';
    currentFolderId = null;
    currentFolderPath = '';
    navigationStack = [];
    updateBreadcrumb();

    try {
        fileList.innerHTML = '<div class="loading">Loading files...</div>';
        const res = await fetch('/api/files');
        const files = await res.json();

        if (files.length === 0) {
            fileList.className = ''; // remove grid for empty state
            fileList.innerHTML = '<div class="empty-state">No files shared yet.<br>Ask the host to share some files!</div>';
            return;
        }

        fileList.className = 'file-grid';
        renderFileList(files, 'root');
    } catch (err) {
        console.error(err);
        fileList.innerHTML = '<div class="empty-state">Failed to load files</div>';
    }
}

// Load folder contents
async function loadFolderContents(folderId, subPath = '') {
    currentView = 'folder';
    currentFolderId = folderId;
    currentFolderPath = subPath;

    try {
        fileList.innerHTML = '<div class="loading">Loading folder...</div>';
        const url = `/api/folder/${folderId}${subPath ? '?path=' + encodeURIComponent(subPath) : ''}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error('Failed to load folder');
        }

        const data = await res.json();
        updateBreadcrumb(data.folderName, subPath);

        if (data.items.length === 0) {
            fileList.className = '';
            fileList.innerHTML = '<div class="empty-state">This folder is empty</div>';
        } else {
            fileList.className = 'file-grid';
            renderFileList(data.items, 'folder', folderId);
        }

    } catch (err) {
        console.error(err);
        fileList.innerHTML = '<div class="empty-state">Failed to load folder</div>';
    }
}

// Render file list
function renderFileList(items, viewType, folderId = null) {
    fileList.innerHTML = '';

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-item';

        const icon = getFileIcon(item); // Returns SVG HTML now
        const size = item.isDirectory ? (item.itemsCount ? item.itemsCount + ' items' : 'Folder') : formatBytes(item.size);
        const isVideo = item.type && item.type.startsWith('video/');
        const isImage = item.type && item.type.startsWith('image/');

        // Card HTML (Soft UI)
        let actionBtn = '';
        if (!item.isDirectory) {
            if (isVideo) actionBtn = `<button class="btn btn-primary btn-sm" style="padding:0.4rem 0.8rem;">Play</button>`;
            else if (isImage) actionBtn = `<button class="btn btn-primary btn-sm" style="padding:0.4rem 0.8rem;">View</button>`;
            else actionBtn = `<button class="btn btn-primary btn-sm" style="padding:0.4rem 0.8rem;">Download</button>`;
        }

        card.innerHTML = `
            <div class="icon-box" style="background:${item.isDirectory ? '#FFF7ED' : '#F4F4F5'}; color:${item.isDirectory ? '#C2410C' : '#52525B'}">${icon}</div>
            <div class="item-info">
                <span class="item-name" title="${item.name}">${item.name}</span>
                <span class="item-meta">${size}</span>
            </div>
            <div class="file-actions">
                ${actionBtn}
            </div>
        `;

        // Click Handler (Main Card)
        card.onclick = () => {
            if (item.isDirectory) {
                if (viewType === 'root') {
                    navigationStack = [{ name: 'Home', folderId: null, path: '' }];
                    navigationStack.push({ name: item.name, folderId: item.id, path: '' });
                    loadFolderContents(item.id, '');
                } else {
                    const newPath = item.path;
                    navigationStack.push({ name: item.name, folderId: currentFolderId, path: newPath });
                    loadFolderContents(currentFolderId, newPath);
                }
            } else if (isVideo) {
                playVideo(item, viewType, folderId);
            } else if (isImage) {
                viewImage(item, viewType, folderId);
            } else {
                // Default action for files: Download
                downloadFile(item, viewType, folderId);
            }
        };

        // Specific Button Handlers
        const downloadBtn = card.querySelector('.file-actions button');
        if (downloadBtn) {
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                downloadFile(item, viewType, folderId);
            }
        }

        fileList.appendChild(card);
    });
}

// Update breadcrumb navigation
function updateBreadcrumb(folderName = '', subPath = '') {
    breadcrumb.innerHTML = '';

    // Home
    const homeSpan = document.createElement('span');
    homeSpan.className = 'breadcrumb-item' + (currentView === 'root' ? ' active' : '');
    homeSpan.textContent = '🏠 Home';
    homeSpan.addEventListener('click', () => loadRootFiles());
    breadcrumb.appendChild(homeSpan);

    if (currentView === 'folder' && navigationStack.length > 0) {
        // Separator
        const sep = document.createElement('span');
        sep.textContent = ' / ';
        sep.style.color = 'var(--text-muted)';
        breadcrumb.appendChild(sep);

        // Show path
        // For simplicity, just show the current folder name or "..." if deep
        // But we have the stack, so let's use it properly

        for (let i = 1; i < navigationStack.length; i++) {
            if (i > 1) {
                const s = document.createElement('span');
                s.textContent = ' / ';
                s.style.color = 'var(--text-muted)';
                breadcrumb.appendChild(s);
            }

            const item = navigationStack[i];
            const isLast = i === navigationStack.length - 1;

            const crumb = document.createElement('span');
            crumb.className = 'breadcrumb-item' + (isLast ? ' active' : '');
            crumb.textContent = item.name;

            if (!isLast) {
                crumb.onclick = () => {
                    navigationStack = navigationStack.slice(0, i + 1);
                    loadFolderContents(item.folderId, item.path);
                };
            }

            breadcrumb.appendChild(crumb);
        }
    }
}

// Download file
function downloadFile(item, viewType, folderId) {
    let url;
    if (viewType === 'root') {
        url = `/api/download/${item.id}`;
    } else {
        url = `/api/folder/${folderId}/download?path=${encodeURIComponent(item.path)}`;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Play video
function playVideo(item, viewType, folderId) {
    let url;
    if (viewType === 'root') {
        url = `/api/download/${item.id}`;
    } else {
        url = `/api/folder/${folderId}/download?path=${encodeURIComponent(item.path)}`;
    }

    videoTitle.textContent = item.name;
    videoPlayer.src = url;
    videoPlayerContainer.classList.add('active'); // Changed from removing hidden to adding active

    // reset hidden class logic if using multiple classes, but new CSS uses .active for modal-overlay
    // Let's ensure compatibility. New CSS: .modal-overlay.active { opacity: 1; pointer-events: auto; }
    // Old CSS used .hidden. 
    // I should strictly use the new CSS classes in app.js
}

// Close video
function closeVideo() {
    videoPlayer.pause();
    videoPlayer.src = '';
    videoPlayerContainer.classList.remove('active');
}

// View image
function viewImage(item, viewType, folderId) {
    let url;
    if (viewType === 'root') {
        url = `/api/download/${item.id}`;
    } else {
        url = `/api/folder/${folderId}/download?path=${encodeURIComponent(item.path)}`;
    }

    imageDisplay.src = url;
    imageViewer.classList.add('active');
}

// Close image
function closeImage() {
    imageDisplay.src = '';
    imageViewer.classList.remove('active');
}

// Get file icon
function getFileIcon(item) {
    if (item.isDirectory) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    }

    const type = item.type || '';
    if (type.startsWith('video/')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;
    }
    if (type.startsWith('image/')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    }
    if (type.startsWith('audio/')) {
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    }

    // Default Document
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
}

// Format bytes
function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

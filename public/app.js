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

        const icon = getFileIcon(item);
        const size = item.isDirectory ? (item.itemsCount ? item.itemsCount + ' items' : 'Folder') : formatBytes(item.size);
        const isVideo = item.type && item.type.startsWith('video/');
        const isImage = item.type && item.type.startsWith('image/');

        // Card HTML
        card.innerHTML = `
            <div class="file-icon">${icon}</div>
            <div class="file-details">
                <span class="file-name" title="${item.name}">${item.name}</span>
                <span class="file-meta">${size}</span>
            </div>
            <div class="file-actions">
                ${!item.isDirectory ? `<button class="btn btn-icon btn-sm" title="Download">⬇</button>` : ''}
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
    if (item.isDirectory) return '📁';

    const type = item.type || '';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📕';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '📦';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    return '📄';
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

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const mime = require('mime-types');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- State ---
let sharedItems = []; // Can be files or folders

// --- System API (Admin Only) ---

// 1. Get Drives (Windows specific)
app.get('/api/system/drives', (req, res) => {
    exec('wmic logicaldisk get name', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.json(['C:', 'D:', 'E:']);
        }
        const drives = stdout.split('\r\r\n')
            .filter(value => value.trim() !== '' && value.trim() !== 'Name')
            .map(value => value.trim());
        res.json(drives);
    });
});

// 2. Browse Directory
app.post('/api/system/browse', (req, res) => {
    let dirPath = req.body.path;

    if (!dirPath || !fs.existsSync(dirPath)) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = items.map(item => {
            return {
                name: item.name,
                isDirectory: item.isDirectory(),
                path: path.join(dirPath, item.name)
            };
        });

        result.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Add to Share (File or Folder - preserves structure)
app.post('/api/share', (req, res) => {
    const { targetPath } = req.body;

    if (!targetPath || !fs.existsSync(targetPath)) {
        return res.status(400).json({ error: 'Invalid path' });
    }

    try {
        const stats = fs.statSync(targetPath);
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        const name = path.basename(targetPath);

        if (sharedItems.some(item => item.path === targetPath)) {
            return res.json({ success: true, message: 'Already shared', count: sharedItems.length });
        }

        if (stats.isDirectory()) {
            sharedItems.push({
                id,
                name,
                path: targetPath,
                isDirectory: true,
                size: 0,
                type: 'folder'
            });
        } else {
            sharedItems.push({
                id,
                name,
                path: targetPath,
                isDirectory: false,
                size: stats.size,
                type: mime.lookup(targetPath) || 'application/octet-stream'
            });
        }

        res.json({ success: true, count: sharedItems.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Remove from Share
app.delete('/api/share/:id', (req, res) => {
    sharedItems = sharedItems.filter(f => f.id !== req.params.id);
    res.json({ success: true });
});

// --- Public Client API ---

// Get root shared items
app.get('/api/files', (req, res) => {
    const responseList = sharedItems.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        type: item.type,
        isDirectory: item.isDirectory
    }));
    res.json(responseList);
});

// Browse folder contents (for shared folders)
app.get('/api/folder/:id', (req, res) => {
    const folderId = req.params.id;
    const subPath = req.query.path || '';

    // Find the shared folder
    const sharedFolder = sharedItems.find(item => item.id === folderId && item.isDirectory);

    if (!sharedFolder) {
        return res.status(404).json({ error: 'Folder not found' });
    }

    try {
        const fullPath = subPath ? path.join(sharedFolder.path, subPath) : sharedFolder.path;

        // Security: Ensure path is within the shared folder
        const resolvedPath = path.resolve(fullPath);
        const resolvedBase = path.resolve(sharedFolder.path);
        if (!resolvedPath.startsWith(resolvedBase)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Path not found' });
        }

        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Not a directory' });
        }

        const items = fs.readdirSync(fullPath, { withFileTypes: true });
        const result = items.map(item => {
            const itemPath = path.join(fullPath, item.name);
            const relativePath = subPath ? path.join(subPath, item.name) : item.name;
            let fileStats = null;

            try {
                fileStats = fs.statSync(itemPath);
            } catch (e) {
                return null;
            }

            return {
                name: item.name,
                path: relativePath,
                isDirectory: item.isDirectory(),
                size: item.isDirectory() ? 0 : fileStats.size,
                type: item.isDirectory() ? 'folder' : (mime.lookup(itemPath) || 'application/octet-stream')
            };
        }).filter(item => item !== null);

        result.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });

        res.json({
            folderName: sharedFolder.name,
            currentPath: subPath,
            items: result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download file from shared folder
app.get('/api/folder/:id/download', (req, res) => {
    const folderId = req.params.id;
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ error: 'Path required' });
    }

    const sharedFolder = sharedItems.find(item => item.id === folderId && item.isDirectory);
    if (!sharedFolder) {
        return res.status(404).json({ error: 'Folder not found' });
    }

    const fullPath = path.join(sharedFolder.path, filePath);

    // Security check
    const resolvedPath = path.resolve(fullPath);
    const resolvedBase = path.resolve(sharedFolder.path);
    if (!resolvedPath.startsWith(resolvedBase)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        return res.status(404).json({ error: 'File not found' });
    }

    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
    res.sendFile(fullPath, { headers: { 'Content-Type': mimeType } });
});

// Download standalone shared file
app.get('/api/download/:id', (req, res) => {
    const fileId = req.params.id;
    const file = sharedItems.find(f => f.id === fileId && !f.isDirectory);

    if (!file) {
        return res.status(404).send('File not found');
    }

    res.sendFile(file.path, { headers: { 'Content-Type': file.type } });
});

// Is Admin check
app.get('/api/is-admin', (req, res) => {
    res.json({ isAdmin: true });
});

// Get local IPs
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

const QRCode = require('qrcode');

// ... existing code ...

app.get('/api/ip', (req, res) => {
    res.json({ ips: getLocalIPs(), port: PORT });
});

// QR Code Endpoint
app.get('/api/qrcode', async (req, res) => {
    try {
        const ips = getLocalIPs();
        const ip = ips.length > 0 ? ips[0] : 'localhost';
        const url = `http://${ip}:${PORT}`;

        const qrDataImage = await QRCode.toDataURL(url);
        res.json({ qr: qrDataImage, url: url });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Admin Dashboard: http://localhost:' + PORT + '/admin.html');
    console.log('Receiver UI: http://localhost:' + PORT);

    // Auto-open browser (Windows specific since we are building for Windows)
    exec('start http://localhost:' + PORT + '/admin.html');
});

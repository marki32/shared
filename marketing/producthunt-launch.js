const { exec } = require('child_process');

// --- NoSherd Product Hunt Launch Details ---
const details = {
    name: 'NoSherd',
    tagline: 'Send files between PC & Phone instantly. No internet needed.',
    url: 'https://noshared.vercel.app',
    topics: 'Productivity, Developer Tools, Tech',
    description: `NoSherd is the fastest way to share files between your PC and phone without needing the internet.

How it works:
1. Run NoSherd on your PC
2. Scan the QR code with your phone
3. Share files instantly over WiFi

Why NoSherd?
- No internet required - works completely offline
- No file size limits - send 10GB files in seconds
- No cloud storage - your files never leave your network
- Works on any device with a browser
- Private & secure - direct WiFi transfer, zero cloud

Free and open source. Works on Windows.`
};

// --- Display everything ---
console.log('');
console.log('=====================================================');
console.log('  🚀 PRODUCT HUNT LAUNCH - COPY THESE DETAILS');
console.log('=====================================================');
console.log('');
console.log(`📛 Name: ${details.name}`);
console.log('');
console.log(`💬 Tagline: ${details.tagline}`);
console.log('');
console.log(`🔗 URL: ${details.url}`);
console.log('');
console.log(`🏷️ Topics: ${details.topics}`);
console.log('');
console.log('📝 Description:');
console.log('---------------------------------------------');
console.log(details.description);
console.log('---------------------------------------------');
console.log('');
console.log('Opening Product Hunt submission page...');

// Open Product Hunt "New Post" page
const url = 'https://www.producthunt.com/posts/new';
const command = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
exec(command, (err) => {
    if (err) {
        console.log('Could not open browser. Go here manually:');
        console.log(url);
    } else {
        console.log('✅ Browser opened! Just copy-paste the details above.');
    }
});

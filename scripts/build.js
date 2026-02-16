const { execSync } = require('child_process');
const rcedit = require('rcedit');
const path = require('path');
const fs = require('fs');

async function build() {
    console.log('🏗️  Building NoSherd executable...');

    // 1. Run pkg
    // Run from project root
    try {
        execSync('npx pkg . --out-path dist', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (e) {
        console.error('❌ Build failed:', e);
        process.exit(1);
    }

    const exePath = path.join(__dirname, '../dist/nosherd.exe');

    if (!fs.existsSync(exePath)) {
        console.error('❌ Executable not found at:', exePath);
        process.exit(1);
    }

    console.log('✨ Build successful. Injecting metadata...');

    // 2. Inject Metadata with rcedit
    try {
        await rcedit(exePath, {
            'version-string': {
                'CompanyName': 'LanShare Team',
                'FileDescription': 'NoSherd - Instant Offline File Sharing',
                'LegalCopyright': 'Copyright (c) 2024 LanShare Team',
                'ProductName': 'NoSherd',
                'ProductVersion': '1.0.0',
                'OriginalFilename': 'nosherd.exe'
            },
            'file-version': '1.0.0',
            'product-version': '1.0.0'
        });
        console.log('✅ Metadata injected successfully!');
    } catch (e) {
        console.error('❌ Metadata injection failed:', e);
        // Don't exit process, just warn, as build is still usable
    }
}

build();

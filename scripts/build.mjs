import { execSync } from 'node:child_process';
import { rcedit } from 'rcedit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
    console.log('🏗️  Building NoSherd executable...');

    // 1. Run pkg
    try {
        // Run from project root
        const rootDir = path.join(__dirname, '..');
        execSync('npx pkg . --out-path dist', { stdio: 'inherit', cwd: rootDir });
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
        // Don't exit process, just warn
    }
}

build();

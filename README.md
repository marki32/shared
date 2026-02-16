# LanShare 📂

A minimal, aesthetic local file sharing application. Share files instantly with devices on your Wi-Fi network without internet.

![LanShare Cover](https://via.placeholder.com/800x400?text=LanShare+Preview)

## Features
- ⚡ **Blazing Fast**: Direct LAN transfer speeds.
- 🎨 **Minimal Design**: Beautiful "Warm Minimalist" UI.
- 📱 **PWA Support**: Installable on mobile/desktop with offline access.
- 🎥 **Media Streaming**: Play videos directly in the browser.
- 🔒 **Secure**: Data never leaves your local network.

## Installation

### For Users (Windows)
1. Download the latest `lan-file-share.exe` from the [Releases](https://github.com/yourusername/lanshare/releases) page.
2. Run the executable.
3. Open `http://localhost:3000/admin.html` to start sharing.

### For Developers
1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/lanshare.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   node server.js
   ```

## Tech Stack
- **Backend**: Node.js, Express
- **Frontend**: HTML5, CSS3, Vanilla JS
- **Packaging**: Pkg

## Troubleshooting

### "Windows protected your PC" (SmartScreen Warning)
Because NoSherd is a new open-source application, Windows SmartScreen may flag it as unrecognized. To run the app:

1. Click **"More info"**.
2. Click **"Run anyway"**.

This warning will disappear once enough users have downloaded and run the application.

## License
MIT

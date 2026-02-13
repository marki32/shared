const { exec } = require('child_process');
const http = require('http');

// --- Configuration ---
const OLLAMA_MODEL = 'kimi-k2.5:cloud';
const APP_URL = 'https://noshared.vercel.app';

// --- Get today's date info ---
const today = new Date();
const day = today.getDate();
const month = today.toLocaleString('en', { month: 'long' });
const weekday = today.toLocaleString('en', { weekday: 'long' });
const isValentine = (today.getMonth() === 1 && day === 14);
const dateContext = isValentine
    ? "Today is Valentine's Day! Use this as a hook."
    : `Today is ${weekday}, ${month} ${day}. Do NOT mention Valentine's Day.`;

// --- Rotating Topics ---
// Pick a random topic each run so captions are never repetitive
const topics = [
    {
        theme: "TROLL WHATSAPP",
        angle: "WhatsApp compresses your photos to garbage quality and stores them on cloud servers. Troll WhatsApp users.",
        example: `Bro you're still sending files on WhatsApp? Enjoy your 144p photos lol. NoSherd sends full quality, no compression, no cloud. ${APP_URL}`
    },
    {
        theme: "TROLL GOOGLE DRIVE",
        angle: "Google Drive is slow, needs internet, and Google scans your files. Troll Google Drive users.",
        example: `Uploading 2GB to Google Drive... estimated time: 3 hours. Or just use NoSherd and send it in 10 seconds over WiFi. Your choice bro. ${APP_URL}`
    },
    {
        theme: "TROLL TELEGRAM",
        angle: "Telegram has a file size limit and your 'private' chats aren't really private. Troll Telegram users.",
        example: `Telegram file limit hit again? Bro just use NoSherd. No size limit, no internet needed, works on any device. ${APP_URL}`
    },
    {
        theme: "MMS / PRIVATE LEAK FEAR",
        angle: "People's private videos and MMS keep getting leaked from cloud apps. Use fear as the hook.",
        example: `That MMS leak news got you worried? Same bro. I switched to NoSherd. No cloud, no internet, zero chance of leak. ${APP_URL}`
    },
    {
        theme: "SLOW TRANSFERS",
        angle: "Cloud uploads are painfully slow. NoSherd uses direct WiFi which is 100x faster. Mock slow transfers.",
        example: `Still waiting for that file to upload? Bro it's 2024. NoSherd transfers 5GB in seconds over WiFi. No internet needed. ${APP_URL}`
    },
    {
        theme: "TROLL BLUETOOTH",
        angle: "Bluetooth is ancient and slow. Troll people who still use Bluetooth for file sharing.",
        example: `Bluetooth transfer in 2024? Bro that's like using a floppy disk. NoSherd is 100x faster, works in your browser. ${APP_URL}`
    },
    {
        theme: "TROLL USB CABLES",
        angle: "Nobody can ever find a working USB cable. Mock the USB cable struggle.",
        example: `Where's that USB cable? Oh wait it's the wrong type again. Just use NoSherd bro. WiFi transfer, no cables needed. ${APP_URL}`
    },
    {
        theme: "PRIVACY / DATA BREACH",
        angle: "Big tech companies keep having data breaches. Your files on their cloud are not safe.",
        example: `Another data breach in the news. Your cloud files? Probably exposed. NoSherd keeps files on YOUR network only. Zero cloud. ${APP_URL}`
    },
    {
        theme: "TROLL AIRDROP",
        angle: "AirDrop only works Apple-to-Apple. Troll AirDrop for not working with Android/Windows.",
        example: `AirDrop doesn't work with Android. AirDrop doesn't work with Windows. NoSherd works with everything. Problem solved. ${APP_URL}`
    },
    {
        theme: "BIG FILES",
        angle: "Email and chat apps reject big files. NoSherd has no limit. Mock file size limits.",
        example: `Email: file too large. WhatsApp: file too large. Telegram: file too large. NoSherd: send whatever you want bro. ${APP_URL}`
    }
];

// Pick random topic
const topic = topics[Math.floor(Math.random() * topics.length)];

// --- Platforms ---
const platforms = [
    {
        name: "Twitter / X",
        url: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    },
    {
        name: "Reddit",
        url: (text) => `https://www.reddit.com/r/software/submit?title=${encodeURIComponent("Found a better way to share files")}&text=${encodeURIComponent(text)}`
    }
];

// --- AI Prompt ---
function generatePost(callback) {
    const prompt = `Write ONE short tweet (max 200 chars) for the app "NoSherd" (${APP_URL}).

TODAY'S TOPIC: ${topic.theme}
ANGLE: ${topic.angle}

RULES:
- Bro-to-bro talk. Simple words. No poetry. No fancy language.
- Troll, mock, or scare people based on the topic above.
- Make people curious so they click.
- Max 2 emojis.
- MUST include ${APP_URL}
- ${dateContext}

EXAMPLE OF THE STYLE:
"${topic.example}"

Write ONLY the caption text. No quotes. No explanation. No hashtags.`;

    const dataStr = JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false
    });

    const dataBytes = Buffer.from(dataStr, 'utf-8');

    const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': dataBytes.length
        },
        timeout: 60000
    };

    console.log(`Asking Kimi... (Topic: ${topic.theme})`);

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const response = JSON.parse(body);
                if (response.response && response.response.trim().length > 10) {
                    let caption = response.response.trim();
                    caption = caption.replace(/^["']|["']$/g, '');
                    callback(caption);
                } else {
                    console.log('AI gave empty response, using backup.');
                    callback(topic.example);
                }
            } catch (e) {
                console.error('Could not parse AI response:', e.message);
                callback(topic.example);
            }
        });
    });

    req.on('timeout', () => {
        console.log('AI took too long, using backup.');
        req.destroy();
        callback(topic.example);
    });

    req.on('error', () => {
        console.log('Ollama not running. Using backup.');
        callback(topic.example);
    });

    req.write(dataBytes);
    req.end();
}

function openUrl(url) {
    const command = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
    exec(command, (err) => {
        if (err) console.error('Failed to open browser:', err);
    });
}

// --- Run ---
console.log('---------------------------------------------------');
console.log('NoSherd Marketing Bot (Kimi AI)');
console.log(`${weekday}, ${month} ${day}`);
console.log(`Topic: ${topic.theme}`);
console.log('---------------------------------------------------');

generatePost((post) => {
    console.log('\nCaption:');
    console.log(post);
    console.log('\n---------------------------------------------------');

    const twitter = platforms[0];
    openUrl(twitter.url(post));
    console.log(`Opened ${twitter.name} - just hit Post!`);
});

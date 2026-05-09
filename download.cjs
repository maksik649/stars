const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

function download(url, dest) {
    https.get(url, options, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
            console.log('Redirecting to:', res.headers.location);
            return download(res.headers.location, dest);
        }
        if (res.statusCode !== 200) {
            console.error(`Failed to download: ${res.statusCode} for ${url}`);
            return;
        }

        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${dest}`);
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

download('https://cdn.brawlify.com/brawlers/borders/16000000.png', './public/assets/player.png');

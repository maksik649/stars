const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Server responded with ${res.statusCode}: ${url}`));
            }

            const dir = path.dirname(dest);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
            file.on('error', (err) => {
                fs.unlink(dest, () => reject(err));
                reject(err);
            });
        }).on('error', reject);
    });
}

async function setup() {
    console.log('Starting asset setup...');
    
    const assets = [
        { url: 'https://cdn.brawlify.com/brawlers/borders/16000000.png', dest: 'public/assets/player.png' },
        { url: 'https://cdn.brawlify.com/brawlers/borders/16000001.png', dest: 'public/assets/colt.png' },
        { url: 'https://cdn.brawlify.com/brawlers/borders/16000002.png', dest: 'public/assets/el_primo.png' }
    ];

    for (const asset of assets) {
        try {
            await download(asset.url, asset.dest);
            console.log(`✓ Downloaded ${asset.dest}`);
        } catch (e) {
            console.error(`✗ Failed to download ${asset.dest}: ${e.message}`);
        }
    }

    // Also fetch Shelly from API
    console.log('Fetching Shelly from API...');
    https.get('https://api.brawlapi.com/v1/brawlers', options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            try {
                if (res.statusCode !== 200) throw new Error(`API returned ${res.statusCode}`);
                const json = JSON.parse(data);
                const list = json.list || json;
                const shelly = list.find(b => b.name === 'SHELLY');
                
                if (shelly && shelly.imageUrl) {
                    await download(shelly.imageUrl, 'public/assets/shelly.png');
                    console.log('✓ Downloaded public/assets/shelly.png');
                }
            } catch (e) {
                console.error(`✗ API Error: ${e.message}`);
            }
            console.log('Setup finished.');
        });
    });
}

setup();

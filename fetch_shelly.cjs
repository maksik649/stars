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
            });
        }).on('error', reject);
    });
}

https.get('https://api.brawlapi.com/v1/brawlers', options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
        try {
            if (res.statusCode !== 200) {
                throw new Error(`API returned ${res.statusCode}`);
            }
            const json = JSON.parse(data);
            const list = json.list || json;
            const shelly = list.find(b => b.name === 'SHELLY');
            
            if (shelly && shelly.imageUrl) {
                console.log('Found Shelly:', shelly.name);
                await download(shelly.imageUrl, 'public/assets/shelly.png');
                console.log('Successfully downloaded Shelly to public/assets/shelly.png');
            } else {
                console.log('Could not find Shelly or image URL in response');
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    });
}).on('error', e => console.error('Network error:', e.message));

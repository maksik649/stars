const fs = require('fs');
const buffer = fs.readFileSync('public/assets/shelly.png');
console.log(buffer.slice(0, 100).toString('utf8'));

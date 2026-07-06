const fs = require('fs');
const http = require('http');
let pngToIco = require('png-to-ico');
if (pngToIco.default) pngToIco = pngToIco.default; // handle ES module interop

http.get('http://localhost:3000/icon', (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to fetch icon. Status Code: ${res.statusCode}`);
    return;
  }
  const dest = fs.createWriteStream('temp.png');
  res.pipe(dest);
  dest.on('finish', () => {
    dest.close();
    pngToIco('temp.png')
      .then(buf => {
        fs.writeFileSync('app/favicon.ico', buf);
        fs.unlinkSync('temp.png');
        console.log('Successfully created app/favicon.ico from app/icon.tsx!');
      })
      .catch(console.error);
  });
}).on('error', (err) => {
  console.error(err);
});

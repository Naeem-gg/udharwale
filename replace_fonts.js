const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        filelist = walkSync(path.join(dir, file), filelist);
      }
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, 'app'), []);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace font imports in globals.css
  if (file.endsWith('globals.css')) {
    content = content.replace(
      /@import url\('https:\/\/fonts.googleapis.com\/css2\?family=Space\+Grotesk.*?display=swap'\);/g,
      "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@400;500;600;700;800&display=swap');"
    );
  }

  // Replace font family names
  content = content.replace(/'Space Grotesk'/g, "'Syne'");
  content = content.replace(/"'Space Grotesk'"/g, "\"'Syne'\"");
  content = content.replace(/Space Grotesk/g, "Syne");
  
  content = content.replace(/'Inter'/g, "'Outfit'");
  content = content.replace(/"'Inter'"/g, "\"'Outfit'\"");
  content = content.replace(/Inter/g, "Outfit");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
console.log('Font replacement complete.');

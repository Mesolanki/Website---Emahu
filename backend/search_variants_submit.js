const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend-web', 'src', 'app', 'seller', 'dashboard', 'page.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("=== MATCHING LINES ===");
lines.forEach((line, idx) => {
  if (line.includes('addVariantOfProductId')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

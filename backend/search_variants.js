const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend-web', 'src', 'components', 'seller_home', 'DynamicProductForm.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("=== SECTIONS ===");
lines.forEach((line, idx) => {
  if (line.includes('Variations') || line.includes('Variant') || line.includes('variant')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

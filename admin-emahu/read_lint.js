const fs = require('fs');
const path = 'lint_output.txt';

if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf16le');
  console.log("--- Full ESLint Error Lines ---");
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('1019') || line.includes('1028') || line.includes('1038') || line.includes('3309')) {
      console.log(line.trim());
    }
  }
} else {
  console.log("File not found");
}

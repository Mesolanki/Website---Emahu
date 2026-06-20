const { execSync } = require('child_process');

try {
  console.log("Running ESLint on page.jsx...");
  const output = execSync('npx eslint src/app/seller/dashboard/page.jsx --format json', { encoding: 'utf8' });
  console.log("No errors found!");
} catch (error) {
  const results = JSON.parse(error.stdout);
  console.log("--- Errors in page.jsx ---");
  for (const result of results) {
    for (const msg of result.messages) {
      if (msg.severity === 2) { // 2 = error, 1 = warning
        console.log(`${msg.line}:${msg.column} - error - ${msg.message} (${msg.ruleId})`);
      }
    }
  }
}

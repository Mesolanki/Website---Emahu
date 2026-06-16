$content = Get-Content 'src/app/seller/dashboard/page.jsx' -Raw -Encoding UTF8

# Find all Authorization Bearer template literals
$matches = [regex]::Matches($content, "'Authorization':\s*``Bearer \`$\{[^}]+\}``")
Write-Host "Authorization Bearer template literals found: $($matches.Count)"
foreach ($m in $matches) {
    $lineNum = ($content.Substring(0, $m.Index) -split "`n").Count
    Write-Host "  Line ~$lineNum: $($m.Value)"
}

# Find all process.env template literals
$envMatches = [regex]::Matches($content, "``\`$\{process\.env\.NEXT_PUBLIC_API_URL[^``]+``")
Write-Host ""
Write-Host "process.env template literals found: $($envMatches.Count)"

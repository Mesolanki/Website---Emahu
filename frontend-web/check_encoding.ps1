$line = (Get-Content 'src/app/seller/dashboard/page.jsx')[224]
$bytes = [System.Text.Encoding]::UTF8.GetBytes($line)
Write-Host "Line 225 hex bytes:"
Write-Host ($bytes | ForEach-Object { $_.ToString('x2') }) -Separator ' '
Write-Host ""
Write-Host "Looking for backtick (0x60) vs curly left quote (0xe2 0x80 0x98/0x9c):"
$hasBadQuote = $bytes | Where-Object { $_ -gt 127 }
if ($hasBadQuote) {
    Write-Host "FOUND non-ASCII bytes - likely corrupted quotes/backticks"
} else {
    Write-Host "All ASCII - checking for backtick (0x60)..."
    $backticks = $bytes | Where-Object { $_ -eq 0x60 }
    Write-Host "Backtick count: $($backticks.Count)"
}

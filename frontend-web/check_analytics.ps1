$line = (Get-Content 'src/utils/analytics.js')[17]  # 0-indexed, so line 18
Write-Host "analytics.js line 18:"
Write-Host "Length: $($line.Length)"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($line)
Write-Host "Bytes: $(($bytes | ForEach-Object { $_.ToString('x2') }) -join ' ')"
Write-Host "Char at position 78: $($line[78])"

# Check for truncation
Write-Host ""
Write-Host "Full line:"
Write-Host $line

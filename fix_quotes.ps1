$pattern = "'`$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:5000'\}"
$replacement = '`${process.env.NEXT_PUBLIC_API_URL || ' + "'http://localhost:5000'" + '}'

$dirs = @(
    "e:\emahu\Website---Emahu\frontend-web\src",
    "e:\emahu\Website---Emahu\admin-emahu\src"
)

foreach ($dir in $dirs) {
    Get-ChildItem -Path $dir -Recurse -Include "*.js","*.jsx" | ForEach-Object {
        $path = $_.FullName
        $lines = Get-Content $path
        $changed = $false
        $newLines = @()
        foreach ($line in $lines) {
            if ($line -match [regex]::Escape("'`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}")) {
                $line = $line -replace [regex]::Escape("'`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}"), ('`${process.env.NEXT_PUBLIC_API_URL || ' + "'http://localhost:5000'" + '}')
                $changed = $true
            }
            $newLines += $line
        }
        if ($changed) {
            $newLines | Set-Content $path
            Write-Host "Fixed quotes in: $path"
        }
    }
}
Write-Host "Done!"

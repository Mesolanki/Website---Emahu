$oldUrl = 'http://localhost:5000'
$newUrl = '${process.env.NEXT_PUBLIC_API_URL || ' + "'http://localhost:5000'" + '}'

$dirs = @(
    "e:\emahu\Website---Emahu\frontend-web\src",
    "e:\emahu\Website---Emahu\admin-emahu\src"
)

foreach ($dir in $dirs) {
    Get-ChildItem -Path $dir -Recurse -Include "*.js","*.jsx" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        if ($content -match [regex]::Escape($oldUrl)) {
            $newContent = $content -replace [regex]::Escape($oldUrl), $newUrl
            Set-Content -Path $_.FullName -Value $newContent -NoNewline
            Write-Host "Updated: $($_.FullName)"
        }
    }
}

Write-Host "Done!"

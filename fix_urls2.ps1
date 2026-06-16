$oldUrl = 'http://localhost:5000'
$newUrl = '${process.env.NEXT_PUBLIC_API_URL || ' + "'http://localhost:5000'" + '}'

$problemFiles = @(
    "e:\emahu\Website---Emahu\frontend-web\src\app\buyer\cart\page.jsx",
    "e:\emahu\Website---Emahu\frontend-web\src\app\buyer\checkout\page.jsx",
    "e:\emahu\Website---Emahu\frontend-web\src\app\buyer\[[...slug]]\page.jsx"
)

foreach ($file in $problemFiles) {
    $lines = Get-Content $file
    $updated = $lines | ForEach-Object { $_ -replace [regex]::Escape($oldUrl), $newUrl }
    $updated | Set-Content $file
    Write-Host "Fixed: $file"
}

Write-Host "Done!"

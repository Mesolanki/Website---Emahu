$clean = "process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'"

# All patterns to fix -> replace them all with the clean pattern
$patterns = @(
    # double-nested mess
    "\`${process\.env\.NEXT_PUBLIC_API_URL \|\| '\`${process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:5000'}'}`",
    # single-quoted mess (not in template literal)
    "\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:5000'\}",
    # raw remaining
    "http://localhost:5000"
)

$dirs = @(
    "e:\emahu\Website---Emahu\frontend-web\src",
    "e:\emahu\Website---Emahu\admin-emahu\src"
)

foreach ($dir in $dirs) {
    Get-ChildItem -Path $dir -Recurse -Include "*.js","*.jsx" | ForEach-Object {
        $path = $_.FullName
        $lines = Get-Content $path
        $changed = $false

        $newLines = $lines | ForEach-Object {
            $line = $_
            # Fix double-nested pattern first
            if ($line -match [regex]::Escape('${process.env.NEXT_PUBLIC_API_URL || ''${process.env.NEXT_PUBLIC_API_URL || ''http://localhost:5000''}''')) {
                $line = $line -replace [regex]::Escape('${process.env.NEXT_PUBLIC_API_URL || ''${process.env.NEXT_PUBLIC_API_URL || ''http://localhost:5000''}'''), ('${' + $clean + '}')
                $changed = $true
            }
            # Fix single-quoted env pattern that is inside '' strings (not template literals)
            if ($line -match "'`$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:5000'\}") {
                $line = $line -replace "'`$\{process\.env\.NEXT_PUBLIC_API_URL \|\| 'http://localhost:5000'\}", ('`${' + $clean + '}')
                $changed = $true
            }
            # Fix raw localhost:5000 remaining
            if ($line -match "http://localhost:5000") {
                $line = $line -replace "http://localhost:5000", ('${' + $clean + '}')
                $changed = $true
            }
            $line
        }

        if ($changed) {
            $newLines | Set-Content $path
            Write-Host "Cleaned: $path"
        }
    }
}

Write-Host "All done!"

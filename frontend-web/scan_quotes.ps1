$content = Get-Content 'src/app/seller/dashboard/page.jsx' -Raw -Encoding UTF8
$templateCount = ([regex]::Matches($content, '`')).Count
Write-Host "Total backticks in dashboard/page.jsx: $templateCount"
$nonStandard = [regex]::Matches($content, '[\u2018\u2019\u201C\u201D\uFF40\u00B4]')
Write-Host "Non-standard quote chars found: $($nonStandard.Count)"
foreach ($m in $nonStandard) {
    $codePoint = [int][char]$m.Value
    Write-Host "NON-STANDARD at index $($m.Index): U+$(($codePoint).ToString('X4')) = '$($m.Value)'"
}

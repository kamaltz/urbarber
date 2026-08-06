$matches = Get-ChildItem src,backend,docs -Recurse -File |
Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
Select-String -Pattern `
"SB-Mid-server-|BEGIN PRIVATE KEY|AIza|FIREBASE_PRIVATE_KEY=|MIDTRANS_SERVER_KEY="

if ($matches) {
    Write-Host ""
    Write-Host "Secret ditemukan!"
    $matches
    exit 1
}

Write-Host "Tidak ada secret."
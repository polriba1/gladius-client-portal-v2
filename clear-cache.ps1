# Script to clear all caches and force a clean rebuild

Write-Host "🧹 Clearing all caches..." -ForegroundColor Yellow

# Remove Vite cache
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "✓ Removed node_modules/.vite" -ForegroundColor Green
}

# Remove .vite directory
if (Test-Path ".vite") {
    Remove-Item -Recurse -Force ".vite"
    Write-Host "✓ Removed .vite" -ForegroundColor Green
}

# Remove dist directory
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✓ Removed dist" -ForegroundColor Green
}

Write-Host "✅ Cache cleared successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now please:" -ForegroundColor Cyan
Write-Host "1. Hard refresh your browser (Ctrl+Shift+R or Ctrl+F5)" -ForegroundColor Cyan
Write-Host "2. Clear browser cache if needed" -ForegroundColor Cyan
Write-Host "3. Restart the dev server if it's running" -ForegroundColor Cyan

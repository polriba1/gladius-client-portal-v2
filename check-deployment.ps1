# Check Vercel Deployment Status
# Run this to verify if your latest changes are deployed

Write-Host "🔍 Checking Git Status..." -ForegroundColor Cyan
git log --oneline -5

Write-Host "`n📦 Latest commit on this branch:" -ForegroundColor Cyan
git log -1 --pretty=format:"%H - %s"

Write-Host "`n`n✅ TO CHECK VERCEL DEPLOYMENT:" -ForegroundColor Green
Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Find your project: gladius-client-portal-v2" -ForegroundColor White
Write-Host "3. Check if commit: a9840f1 is deployed" -ForegroundColor Yellow
Write-Host "4. Verify which branch is connected to production" -ForegroundColor Yellow

Write-Host "`n🚀 IF NOT DEPLOYED YET:" -ForegroundColor Magenta
Write-Host "Option 1: Wait for auto-deploy (if configured)" -ForegroundColor White
Write-Host "Option 2: Manually redeploy from Vercel dashboard" -ForegroundColor White
Write-Host "Option 3: Merge to main branch if that's your production branch" -ForegroundColor White

Write-Host "`n📋 CURRENT STATUS:" -ForegroundColor Cyan
Write-Host "✅ Edge Functions: Deployed on Supabase" -ForegroundColor Green
Write-Host "✅ Code Changes: Committed and pushed" -ForegroundColor Green
Write-Host "⏳ Vercel Deploy: NEEDS VERIFICATION" -ForegroundColor Yellow

Write-Host "`n🧪 AFTER DEPLOYMENT, TEST:" -ForegroundColor Cyan
Write-Host "1. Open production URL" -ForegroundColor White
Write-Host "2. Go to Calendario page" -ForegroundColor White
Write-Host "3. Open browser console (F12)" -ForegroundColor White
Write-Host "4. Generate WhatsApp message for technician with multiple incidents" -ForegroundColor White
Write-Host "5. Check console logs for 'Edge Function' messages" -ForegroundColor White
Write-Host "6. Verify client #14914565 loads successfully" -ForegroundColor White

Write-Host "`n📖 For detailed checklist, see: PRODUCTION-DEPLOYMENT-CHECK.md" -ForegroundColor Cyan
Write-Host ""

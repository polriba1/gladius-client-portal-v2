$functions = @(
    "stel-events-v3",
    "stel-incidents-v3",
    "stel-event-types-v3",
    "stel-incident-types-v3",
    "stel-incident-states-v3"
)

Write-Host "Deploying Supabase Edge Functions..." -ForegroundColor Cyan

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    supabase functions deploy $func --no-verify-jwt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy $func" -ForegroundColor Red
    }
}

Write-Host "All deployments attempted." -ForegroundColor Cyan

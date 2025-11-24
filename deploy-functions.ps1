$functions = @(
    "stel-incident-types-v2",
    "stel-incident-states-v2",
    "stel-employee-v2",
    "stel-incidents-v2",
    "stel-event-types-v2",
    "stel-events-v2",
    "stel-client-v2",
    "stel-address-v2"
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

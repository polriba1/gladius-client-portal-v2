# Script para desplegar las funciones Edge de STEL a Supabase
# Uso: .\deploy-stel-functions.ps1

Write-Host "Desplegando funciones STEL a Supabase..." -ForegroundColor Cyan

$PROJECT_REF = "fvcxkcmvlpuootmtfcty"
$functions = @("stel-incidents", "stel-client", "stel-employee")

Write-Host "`nFunciones encontradas:" -ForegroundColor Green
foreach ($func in $functions) {
    $functionPath = "supabase\functions\$func"
    if (Test-Path $functionPath) {
        Write-Host "  [OK] $func" -ForegroundColor Green
    } else {
        Write-Host "  [X] $func - NO ENCONTRADA" -ForegroundColor Red
    }
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "INSTRUCCIONES PARA DESPLEGAR:" -ForegroundColor Yellow
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "1. Ve a: https://supabase.com/dashboard/project/$PROJECT_REF/functions`n"

Write-Host "2. Para cada funcion (stel-incidents, stel-client, stel-employee):"
Write-Host "   - Haz clic en 'New Edge Function' o actualiza la existente"
Write-Host "   - Copia el codigo del archivo correspondiente en supabase\functions\"
Write-Host "   - Asegurate de que STEL_API_KEY este configurada`n"

Write-Host "3. Verifica que las funciones se desplieguen correctamente`n"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "ALTERNATIVA: Usar Supabase CLI" -ForegroundColor Yellow
Write-Host "================================================`n" -ForegroundColor Cyan

Write-Host "Instalar con scoop (Windows):"
Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
Write-Host "  scoop install supabase`n"

Write-Host "Luego desplegar:"
Write-Host "  supabase login"
Write-Host "  supabase functions deploy stel-incidents --project-ref $PROJECT_REF"
Write-Host "  supabase functions deploy stel-client --project-ref $PROJECT_REF"
Write-Host "  supabase functions deploy stel-employee --project-ref $PROJECT_REF`n"

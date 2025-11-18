# Script de despliegue de Edge Functions para Supabase
# Este script despliega todas las Edge Functions necesarias para el calendario

$PROJECT_REF = "fvcxkcmvlpuootmtfcty"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DESPLEGANDO EDGE FUNCTIONS A SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Supabase CLI está instalado
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ ERROR: Supabase CLI no está instalado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalar Supabase CLI en Windows:" -ForegroundColor Yellow
    Write-Host "  1. Instala Scoop: https://scoop.sh" -ForegroundColor Yellow
    Write-Host "  2. Ejecuta: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor Yellow
    Write-Host "  3. Ejecuta: scoop install supabase" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Verificar login
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Yellow
$loginStatus = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: No estás autenticado en Supabase." -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor ejecuta: supabase login" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Autenticación verificada" -ForegroundColor Green
Write-Host ""

# Funciones prioritarias (para el calendario)
$priorityFunctions = @(
    "stel-events",
    "stel-event-types"
)

# Otras funciones STEL
$otherFunctions = @(
    "stel-employee",
    "stel-incidents",
    "stel-client"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚨 DESPLEGANDO FUNCIONES PRIORITARIAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($func in $priorityFunctions) {
    Write-Host "📦 Desplegando: $func..." -ForegroundColor Yellow
    supabase functions deploy $func --project-ref $PROJECT_REF
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func desplegado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR al desplegar $func" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor revisa el error anterior y vuelve a intentarlo." -ForegroundColor Yellow
        exit 1
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 DESPLEGANDO FUNCIONES ADICIONALES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($func in $otherFunctions) {
    Write-Host "📦 Desplegando: $func..." -ForegroundColor Yellow
    supabase functions deploy $func --project-ref $PROJECT_REF
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func desplegado correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  ADVERTENCIA: Error al desplegar $func (no crítico)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verifica que la variable STEL_API_KEY está configurada:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Verifica que las funciones están activas:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF/functions" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Prueba el calendario:" -ForegroundColor White
Write-Host "   https://www.gladiusai.es/calendario" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Revisa la consola del navegador para ver logs:" -ForegroundColor White
Write-Host "   - Deberías ver: '✅ Created assignee-to-TEC map with X entries' (X > 0)" -ForegroundColor White
Write-Host "   - NO deberías ver errores de CORS" -ForegroundColor White
Write-Host ""


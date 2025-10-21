# Script per desplegar a producció
# Assegura't que tots els canvis estan commitats abans d'executar

Write-Host "🚀 Desplegant a producció..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que estem a la branca correcta
$currentBranch = git branch --show-current
Write-Host "📌 Branca actual: $currentBranch" -ForegroundColor Yellow

# 2. Verificar que no hi ha canvis sense commitjar
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Hi ha canvis sense commitjar:" -ForegroundColor Red
    git status --short
    Write-Host ""
    $response = Read-Host "Vols commitjar aquests canvis? (s/n)"
    if ($response -eq "s") {
        git add -A
        $message = Read-Host "Missatge del commit"
        git commit -m $message
        git push origin $currentBranch
    } else {
        Write-Host "❌ Cancel·lant desplegament" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Tots els canvis estan commitats" -ForegroundColor Green
Write-Host ""

# 3. Verificar que estem sincronitzats amb origin
Write-Host "🔄 Sincronitzant amb GitHub..." -ForegroundColor Cyan
git fetch origin

$behind = git rev-list HEAD..origin/$currentBranch --count
if ($behind -gt 0) {
    Write-Host "⚠️  La branca local està $behind commits per darrera d'origin" -ForegroundColor Red
    git pull origin $currentBranch
}

$ahead = git rev-list origin/$currentBranch..HEAD --count
if ($ahead -gt 0) {
    Write-Host "📤 Pujant $ahead commits a GitHub..." -ForegroundColor Yellow
    git push origin $currentBranch
}

Write-Host "✅ Sincronitzat amb GitHub" -ForegroundColor Green
Write-Host ""

# 4. Opcions de desplegament
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "OPCIONS DE DESPLEGAMENT" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Desplegar automàticament amb Vercel CLI"
Write-Host "2. Desplegar manualment des del Dashboard de Vercel"
Write-Host "3. Fer merge a main (desplegament automàtic)"
Write-Host ""

$option = Read-Host "Selecciona una opció (1-3)"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "📦 Desplegant amb Vercel CLI..." -ForegroundColor Cyan
        
        # Verificar si Vercel CLI està instal·lat
        $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
        if (-not $vercelInstalled) {
            Write-Host "⚠️  Vercel CLI no està instal·lat" -ForegroundColor Red
            Write-Host "Instal·lant Vercel CLI..." -ForegroundColor Yellow
            npm install -g vercel
        }
        
        Write-Host "🚀 Desplegant a producció..." -ForegroundColor Green
        vercel --prod
    }
    
    "2" {
        Write-Host ""
        Write-Host "📋 INSTRUCCIONS PER DESPLEGAR MANUALMENT:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Ves a: https://vercel.com/dashboard"
        Write-Host "2. Selecciona el projecte: client-portal-gladiusai-v3"
        Write-Host "3. Ves a la pestanya 'Deployments'"
        Write-Host "4. Troba el últim deployment de la branca: $currentBranch"
        Write-Host "5. Clica 'Redeploy' per forçar un nou desplegament"
        Write-Host ""
        Write-Host "Alternativament:"
        Write-Host "- Ves a Settings → Git"
        Write-Host "- Força un redeploy des de la branca actual"
        Write-Host ""
        
        $openBrowser = Read-Host "Vols obrir el dashboard de Vercel? (s/n)"
        if ($openBrowser -eq "s") {
            Start-Process "https://vercel.com/dashboard"
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "⚠️  ATENCIÓ: Això farà merge a main i desplegarà automàticament!" -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Estàs segur? (escriu 'SI' per confirmar)"
        
        if ($confirm -eq "SI") {
            Write-Host "🔀 Fent merge a main..." -ForegroundColor Cyan
            git checkout main
            git merge $currentBranch
            git push origin main
            
            Write-Host "✅ Merge completat! Vercel desplegarà automàticament" -ForegroundColor Green
            Write-Host "Pots seguir el desplegament a: https://vercel.com/dashboard" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Merge cancel·lat" -ForegroundColor Red
        }
    }
    
    default {
        Write-Host "❌ Opció no vàlida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Procés completat!" -ForegroundColor Green

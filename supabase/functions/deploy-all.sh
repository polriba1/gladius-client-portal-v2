#!/bin/bash

# Script de despliegue de Edge Functions para Supabase
# Este script despliega todas las Edge Functions necesarias para el calendario

PROJECT_REF="fvcxkcmvlpuootmtfcty"

echo "========================================"
echo "🚀 DESPLEGANDO EDGE FUNCTIONS A SUPABASE"
echo "========================================"
echo ""

# Verificar que Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ ERROR: Supabase CLI no está instalado."
    echo ""
    echo "Para instalar Supabase CLI:"
    echo "  macOS/Linux: brew install supabase/tap/supabase"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Verificar login
echo "🔐 Verificando autenticación..."
if ! supabase projects list &> /dev/null; then
    echo "❌ ERROR: No estás autenticado en Supabase."
    echo ""
    echo "Por favor ejecuta: supabase login"
    echo ""
    exit 1
fi

echo "✅ Autenticación verificada"
echo ""

# Funciones prioritarias (para el calendario)
PRIORITY_FUNCTIONS=(
    "stel-events"
    "stel-event-types"
)

# Otras funciones STEL
OTHER_FUNCTIONS=(
    "stel-employee"
    "stel-incidents"
    "stel-client"
)

echo "========================================"
echo "🚨 DESPLEGANDO FUNCIONES PRIORITARIAS"
echo "========================================"
echo ""

for func in "${PRIORITY_FUNCTIONS[@]}"; do
    echo "📦 Desplegando: $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF"
    
    if [ $? -eq 0 ]; then
        echo "✅ $func desplegado correctamente"
    else
        echo "❌ ERROR al desplegar $func"
        echo ""
        echo "Por favor revisa el error anterior y vuelve a intentarlo."
        exit 1
    fi
    echo ""
done

echo "========================================"
echo "📦 DESPLEGANDO FUNCIONES ADICIONALES"
echo "========================================"
echo ""

for func in "${OTHER_FUNCTIONS[@]}"; do
    echo "📦 Desplegando: $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF"
    
    if [ $? -eq 0 ]; then
        echo "✅ $func desplegado correctamente"
    else
        echo "⚠️  ADVERTENCIA: Error al desplegar $func (no crítico)"
    fi
    echo ""
done

echo "========================================"
echo "✅ DESPLIEGUE COMPLETADO"
echo "========================================"
echo ""

echo "📝 PRÓXIMOS PASOS:"
echo ""
echo "1. Verifica que la variable STEL_API_KEY está configurada:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo ""
echo "2. Verifica que las funciones están activas:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo ""
echo "3. Prueba el calendario:"
echo "   https://www.gladiusai.es/calendario"
echo ""
echo "4. Revisa la consola del navegador para ver logs:"
echo "   - Deberías ver: '✅ Created assignee-to-TEC map with X entries' (X > 0)"
echo "   - NO deberías ver errores de CORS"
echo ""


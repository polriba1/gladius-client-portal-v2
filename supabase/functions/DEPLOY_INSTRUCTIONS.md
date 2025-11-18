# 🚀 Instrucciones de Despliegue - Edge Functions

## ⚠️ PROBLEMA ACTUAL EN PRODUCCIÓN

El calendario en producción muestra este error:

```
❌ Error CORS en stel-event-types
❌ Created assignee-to-TEC map with 0 entries
⚠️ Events cargan pero NO se encuentran técnicos
```

**Causa:** Las Edge Functions `stel-events` y `stel-event-types` no están desplegadas correctamente en producción.

**Solución:** Desplegar las Edge Functions siguiendo estos pasos.

---

## 📋 Prerequisitos

1. **Supabase CLI instalado**
   - Windows: Ver instrucciones abajo
   - macOS/Linux: `brew install supabase/tap/supabase`

2. **Autenticación en Supabase**
   - Ejecutar: `supabase login`

3. **Variable de entorno STEL_API_KEY configurada en Supabase**
   - Ir a: https://supabase.com/dashboard/project/fvcxkcmvlpuootmtfcty/settings/functions
   - Verificar que `STEL_API_KEY` existe

---

## 🚀 OPCIÓN 1: Despliegue Automático (RECOMENDADO)

### Windows (PowerShell)

```powershell
cd gladius-client-portal-v2/supabase/functions
.\deploy-all.ps1
```

### macOS/Linux (Bash)

```bash
cd gladius-client-portal-v2/supabase/functions
chmod +x deploy-all.sh
./deploy-all.sh
```

Este script automáticamente:
- ✅ Verifica que Supabase CLI está instalado
- ✅ Verifica autenticación
- ✅ Despliega funciones prioritarias: `stel-events`, `stel-event-types`
- ✅ Despliega funciones adicionales: `stel-employee`, `stel-incidents`, `stel-client`
- ✅ Muestra pasos de verificación

---

## 🛠️ OPCIÓN 2: Despliegue Manual

### Paso 1: Instalar Supabase CLI (solo si no está instalado)

**Windows con Scoop:**
```powershell
# Instalar Scoop (si no lo tienes)
iwr -useb get.scoop.sh | iex

# Agregar bucket de Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Instalar Supabase CLI
scoop install supabase
```

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

### Paso 2: Autenticarse

```bash
supabase login
```

### Paso 3: Desplegar las funciones prioritarias (CRÍTICO)

```bash
# Navegar al directorio raíz del proyecto
cd gladius-client-portal-v2

# Desplegar funciones del calendario (PRIORITARIO)
supabase functions deploy stel-events --project-ref fvcxkcmvlpuootmtfcty
supabase functions deploy stel-event-types --project-ref fvcxkcmvlpuootmtfcty
```

### Paso 4: Desplegar funciones adicionales

```bash
supabase functions deploy stel-employee --project-ref fvcxkcmvlpuootmtfcty
supabase functions deploy stel-incidents --project-ref fvcxkcmvlpuootmtfcty
supabase functions deploy stel-client --project-ref fvcxkcmvlpuootmtfcty
```

---

## ✅ Verificación del Despliegue

### 1. Verificar en el Dashboard de Supabase

Ve a: https://supabase.com/dashboard/project/fvcxkcmvlpuootmtfcty/functions

Deberías ver:
- ✅ `stel-events` - Estado: Active
- ✅ `stel-event-types` - Estado: Active
- ✅ `stel-employee` - Estado: Active
- ✅ `stel-incidents` - Estado: Active
- ✅ `stel-client` - Estado: Active

### 2. Verificar la variable STEL_API_KEY

Ve a: https://supabase.com/dashboard/project/fvcxkcmvlpuootmtfcty/settings/functions

Verifica que existe el secret:
- ✅ `STEL_API_KEY` = `[tu API key de STEL Order]`

Si no existe, créalo:
```bash
supabase secrets set STEL_API_KEY=your_api_key_here --project-ref fvcxkcmvlpuootmtfcty
```

### 3. Probar en producción

1. Ve a: https://www.gladiusai.es/calendario
2. Abre la consola del navegador (F12)
3. Busca estos logs:

**✅ CORRECTO:**
```
✅ Events received from Edge Function: (500) [...]
✅ Total events fetched: 500
🔄 Attempting to fetch event types from stel-event-types...
✅ Fetched X event types for IDs: ...
✅ Created assignee-to-TEC map with X entries  // X > 0 ✅
```

**❌ ERROR (antes de desplegar):**
```
❌ Error CORS en stel-event-types
⚠️ Event types data is empty or invalid
🔄 FALLBACK: Event types fetch failed, trying to get TEC codes from employees...
✅ Created assignee-to-TEC map with 0 entries  // 0 entries ❌
```

**🔄 FALLBACK FUNCIONANDO (si stel-event-types aún falla):**
```
⚠️ Event types data is empty or invalid
🔄 FALLBACK: Event types fetch failed, trying to get TEC codes from employees...
✅ FALLBACK: Mapped employee X to TECXXX
✅ FALLBACK: Successfully mapped X event types via employee data
✅ Created assignee-to-TEC map with X entries  // X > 0 ✅
```

---

## 🔧 Solución de Problemas

### Error: "CORS policy"

**Problema:** Las funciones no están desplegadas o tienen versión antigua sin CORS.

**Solución:**
1. Redesplegar las funciones: `./deploy-all.ps1` (o `.sh`)
2. Esperar 1-2 minutos para que se propague
3. Hacer hard refresh (Ctrl+F5) en el navegador

---

### Error: "STEL_API_KEY not set"

**Problema:** La variable de entorno no está configurada en Supabase.

**Solución:**
```bash
supabase secrets set STEL_API_KEY=your_api_key_here --project-ref fvcxkcmvlpuootmtfcty
```

---

### Error: "Created assignee-to-TEC map with 0 entries"

**Problema:** 
- Opción A: `stel-event-types` no está desplegada
- Opción B: `stel-employee` no está desplegada (para fallback)

**Solución:**
1. Desplegar ambas funciones
2. Verificar logs en consola para ver si el FALLBACK se activa
3. Si el FALLBACK funciona, verás: "FALLBACK: Successfully mapped X event types"

---

### Los eventos cargan pero no veo técnicos en el calendario

**Problema:** El mapa assignee-to-TEC está vacío.

**Solución:**
1. Verificar en consola: "Created assignee-to-TEC map with X entries"
2. Si X = 0:
   - Desplegar `stel-event-types`
   - Desplegar `stel-employee` (fallback)
3. Hacer hard refresh (Ctrl+F5)

---

## 📝 Cambios Implementados en el Código

### 1. Fallback Robusto en Calendario.tsx

Se ha implementado un sistema de fallback de 2 niveles:

**Nivel 1 (Preferido):** 
- Obtener tipos de eventos con `stel-event-types`
- Extraer TEC codes de los nombres de event types

**Nivel 2 (Fallback):** 
- Si Nivel 1 falla, obtener empleados con `stel-employee`
- Extraer TEC codes de los nombres de empleados
- Mapear event types a TEC codes via empleados asignados

**Beneficios:**
- ✅ Funciona incluso si `stel-event-types` falla o no está desplegada
- ✅ Manejo robusto de errores con logs detallados
- ✅ No bloquea la carga del calendario

### 2. Mejoras en Edge Functions

Todas las Edge Functions tienen:
- ✅ Headers CORS correctos
- ✅ Manejo de preflight OPTIONS
- ✅ Manejo de errores robusto
- ✅ Logs detallados para debugging

---

## 🎯 Resumen de Archivos Modificados

- ✅ `gladius-client-portal-v2/src/pages/Calendario.tsx` - Fallback robusto
- ✅ `gladius-client-portal-v2/supabase/functions/stel-events/index.ts` - CORS correcto
- ✅ `gladius-client-portal-v2/supabase/functions/stel-event-types/index.ts` - CORS correcto
- ✅ `gladius-client-portal-v2/supabase/functions/stel-employee/index.ts` - Ya existía con CORS
- ✅ `gladius-client-portal-v2/supabase/functions/deploy-all.ps1` - Script Windows
- ✅ `gladius-client-portal-v2/supabase/functions/deploy-all.sh` - Script macOS/Linux
- ✅ `gladius-client-portal-v2/supabase/functions/DEPLOYMENT.md` - Documentación actualizada

---

## 🚀 Próximos Pasos

1. **Ejecutar el script de despliegue:**
   - Windows: `.\deploy-all.ps1`
   - macOS/Linux: `./deploy-all.sh`

2. **Verificar en el dashboard:**
   - https://supabase.com/dashboard/project/fvcxkcmvlpuootmtfcty/functions

3. **Probar en producción:**
   - https://www.gladiusai.es/calendario

4. **Verificar logs en consola:**
   - Buscar: "Created assignee-to-TEC map with X entries" (X > 0)

---

## 📞 Soporte

Si después de seguir estos pasos sigues teniendo problemas:

1. Revisa los logs de las Edge Functions en Supabase Dashboard
2. Verifica que `STEL_API_KEY` está correctamente configurada
3. Verifica que las funciones tienen estado "Active" en el dashboard
4. Haz hard refresh (Ctrl+F5) en el navegador después de desplegar

---

**Última actualización:** 2025-11-18
**Versión del calendario:** 3.0
**Funciones desplegadas:** stel-events, stel-event-types, stel-employee, stel-incidents, stel-client


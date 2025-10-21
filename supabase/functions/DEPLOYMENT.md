# Desplegament de Funcions STEL Edge Functions

Aquest document explica com desplegar les noves funcions Edge de STEL a Supabase.

## 📋 Funcions a Desplegar

- `stel-incidents` - Obté incidències de STEL Order API
- `stel-client` - Obté informació de clients de STEL Order API
- `stel-employee` - Obté informació d'empleats de STEL Order API

## 🚀 Opció 1: Desplegar des del Dashboard (RECOMANAT)

### Pas 1: Accedir al Dashboard
Ves a: https://supabase.com/dashboard/project/fvcxkcmvlpuootmtfcty/functions

### Pas 2: Desplegar cada funció

Per cada funció (`stel-incidents`, `stel-client`, `stel-employee`):

1. **Crea o actualitza la funció:**
   - Si no existeix: Clica "New Edge Function"
   - Si existeix: Clica sobre la funció existent

2. **Copia el codi:**
   - Obre el fitxer corresponent:
     - `supabase/functions/stel-incidents/index.ts`
     - `supabase/functions/stel-client/index.ts`
     - `supabase/functions/stel-employee/index.ts`
   - Copia tot el contingut al editor del dashboard

3. **Configura les variables d'entorn:**
   - Assegura't que `STEL_API_KEY` estigui configurada
   - Ves a Settings → Edge Functions → Secrets
   - Afegeix: `STEL_API_KEY` = `[la teva API key de STEL Order]`

4. **Desplega:**
   - Clica "Deploy" o "Update"
   - Espera que es completi el desplegament

### Pas 3: Verificar

Verifica que cada funció està desplegada correctament:
- Hauria d'aparèixer amb estat "Active"
- Pots fer un test des del dashboard

## 🛠️ Opció 2: Usar Supabase CLI

### Instal·lació

**Windows (amb Scoop):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

### Login
```bash
supabase login
```

### Desplegar funcions
```bash
# Desplegar totes les funcions STEL
supabase functions deploy stel-incidents --project-ref fvcxkcmvlpuootmtfcty
supabase functions deploy stel-client --project-ref fvcxkcmvlpuootmtfcty
supabase functions deploy stel-employee --project-ref fvcxkcmvlpuootmtfcty
```

### Configurar secrets
```bash
supabase secrets set STEL_API_KEY=your_api_key_here --project-ref fvcxkcmvlpuootmtfcty
```

## 🧪 Verificar Desplegament

Després de desplegar, verifica que funcionen:

1. **Des del navegador:**
   - Ves a https://www.gladiusai.es/calendario
   - Clica "Cargar Incidencias"
   - Hauria de carregar sense errors CORS

2. **Des de la consola del navegador:**
   - No hauries de veure errors com "CORS policy" o "Failed to load resource"
   - Hauries de veure logs com "✅ Total incidents fetched: X"

## ⚠️ Problemes Comuns

### Error: CORS policy
- **Causa:** Les funcions no estan desplegades o tenen els headers CORS incorrectes
- **Solució:** Redesplega les funcions amb els nous headers CORS

### Error: STEL_API_KEY not set
- **Causa:** La variable d'entorn no està configurada
- **Solució:** Configura `STEL_API_KEY` a les Edge Function Secrets

### Error: 404 Not Found
- **Causa:** La funció no està desplegada
- **Solució:** Desplega la funció des del dashboard o amb CLI

## 📝 Canvis Respecte a `stel-events`

Anteriorment teníem `stel-events`, ara tenim:
- ✅ `stel-incidents` - Reemplaça `stel-events` (ara usa incidents en lloc d'events)
- ✅ `stel-client` - Nova funció per obtenir info de clients
- ✅ `stel-employee` - Nova funció per obtenir info d'empleats

La funció `stel-events` ja no es necessita i pot ser eliminada.

## 🔗 Referències

- Dashboard de Supabase: https://supabase.com/dashboard
- Documentació Edge Functions: https://supabase.com/docs/guides/functions
- STEL Order API: https://app.stelorder.com/

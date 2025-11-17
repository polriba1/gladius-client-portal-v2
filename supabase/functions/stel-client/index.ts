import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request")
    return new Response("ok", { headers: corsHeaders, status: 200 })
  }

  try {
    const stelApiKey = Deno.env.get("STEL_API_KEY")
    if (!stelApiKey) throw new Error("STEL_API_KEY not set")

    const { clientId } = await req.json()
    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    console.log(`[stel-client] Fetching client: ${clientId}`)

    // Try regular clients endpoint first
    const clientsUrl = `https://app.stelorder.com/app/clients/${clientId}`
    console.log(`[stel-client] Step 1: Trying /clients endpoint: ${clientsUrl}`)
    let response = await fetch(clientsUrl, {
      headers: { APIKEY: stelApiKey },
    })
    console.log(`[stel-client] /clients response status: ${response.status}`)

    let shouldFallbackToPotential = false
    let data: unknown = null

    if (!response.ok) {
      shouldFallbackToPotential = true
      console.warn(`[stel-client] /clients returned non-ok status ${response.status}. Will try /potentialClients...`)
    } else {
      data = await response.json()
      const clientCandidate = Array.isArray(data) ? data[0] : data

      if (!clientCandidate || !clientCandidate.id) {
        shouldFallbackToPotential = true
        console.warn(`[stel-client] /clients response missing valid client payload. Will try /potentialClients...`)
      } else {
        console.log(`[stel-client] SUCCESS: Client ${clientId} fetched via /clients. Name: ${clientCandidate.name || clientCandidate['legal-name']}`)
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    const potentialClientsUrl = `https://app.stelorder.com/app/potentialClients/${clientId}`

    if (shouldFallbackToPotential) {
      console.log(`[stel-client] Step 2: Trying /potentialClients endpoint: ${potentialClientsUrl}`)
      response = await fetch(potentialClientsUrl, {
        headers: { APIKEY: stelApiKey },
      })
      console.log(`[stel-client] /potentialClients response status: ${response.status}`)

      if (response.status === 404) {
        console.log(`[stel-client] ERROR: Client ${clientId} not found in both /clients and /potentialClients (404)`)
        return new Response(JSON.stringify({ error: "Client not found", clientId }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[stel-client] STEL API error ${response.status}: ${errorText}`)
        throw new Error(`API error: ${response.status}`)
      }

      data = await response.json()
      const potentialClient = Array.isArray(data) ? data[0] : data

      if (!potentialClient || !potentialClient.id) {
        console.error(`[stel-client] Invalid payload from /potentialClients for ${clientId}`)
        throw new Error("Invalid potentialClients response")
      }

      console.log(`[stel-client] SUCCESS: Client ${clientId} fetched via /potentialClients. Name: ${potentialClient.name || potentialClient['legal-name']}`)
    }
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[stel-client] EXCEPTION:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

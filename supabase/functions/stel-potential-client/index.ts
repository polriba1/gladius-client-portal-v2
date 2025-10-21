import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    console.log("[stel-potential-client] Handling OPTIONS preflight request")
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

    console.log(`[stel-potential-client] Fetching potential client: ${clientId}`)

    const potentialClientsUrl = `https://app.stelorder.com/app/potentialClients/${clientId}`
    console.log(`[stel-potential-client] Trying /potentialClients endpoint: ${potentialClientsUrl}`)
    
    const response = await fetch(potentialClientsUrl, {
      headers: { APIKEY: stelApiKey },
    })
    
    console.log(`[stel-potential-client] /potentialClients response status: ${response.status}`)

    if (response.status === 404) {
      console.log(`[stel-potential-client] ERROR: Potential client ${clientId} not found (404)`)
      return new Response(JSON.stringify({ error: "Potential client not found", clientId }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[stel-potential-client] STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[stel-potential-client] SUCCESS: Potential client ${clientId} fetched successfully. Name: ${data.name || data['legal-name']}`)
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("[stel-potential-client] EXCEPTION:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

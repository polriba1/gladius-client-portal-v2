import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Client V2 function loaded")

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
    if (!stelApiKey) {
      console.error("STEL_API_KEY not set")
      throw new Error("STEL_API_KEY not set")
    }

    let clientId = ""

    if (req.method === "POST") {
      try {
        const body = await req.json()
        clientId = body.clientId || ""
        console.log(`Request body: clientId=${clientId}`)
      } catch (_e) {
        console.log("No JSON body received")
        return new Response(JSON.stringify({ error: "clientId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    if (!clientId) {
      return new Response(JSON.stringify({ error: "clientId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log(`Fetching client ${clientId}`)

    // Try 1: Regular clients endpoint
    let clientUrl = `https://app.stelorder.com/app/clients/${clientId}`
    console.log(`[1/2] Trying clients endpoint: ${clientUrl}`)
    
    let response = await fetch(clientUrl, {
      headers: { APIKEY: stelApiKey },
    })
    
    let client = null
    
    if (response.ok) {
      const clientData = await response.json()
      console.log(`✅ Clients endpoint SUCCESS`)
      client = Array.isArray(clientData) ? clientData[0] : clientData
      
      if (client && client.id) {
        console.log(`Found client in /clients: ${client.name || client['legal-name']} (ID: ${client.id})`)
        return new Response(JSON.stringify(client), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    } else {
      console.warn(`⚠️ Clients endpoint FAILED with status ${response.status}`)
    }
    
    // Try 2: Potential clients endpoint (fallback)
    clientUrl = `https://app.stelorder.com/app/potentialClients/${clientId}`
    console.log(`[2/2] Trying potentialClients endpoint: ${clientUrl}`)
    
    response = await fetch(clientUrl, {
      headers: { APIKEY: stelApiKey },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Client ${clientId} not found in both endpoints (404)`)
        return new Response(JSON.stringify({ error: "Client not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }
    
    const clientData = await response.json()
    client = Array.isArray(clientData) ? clientData[0] : clientData
    
    if (!client || !client.id) {
      throw new Error(`Client ${clientId} not found or has invalid response`)
    }
    
    console.log(`Found client in /potentialClients: ${client.name || client['legal-name']} (ID: ${client.id})`)
    
    return new Response(JSON.stringify(client), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-client-v2:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})


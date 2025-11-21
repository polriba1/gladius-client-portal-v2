import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Incident Types V2 function loaded")

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

    let limit = "500"

    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
        console.log(`Request body: limit=${limit}`)
      } catch (_e) {
        console.log("No JSON body received, using defaults")
      }
    }

    console.log(`Fetching all incident types with limit=${limit}`)

    const apiUrl = `https://app.stelorder.com/app/incidentTypes?limit=${limit}`

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const incidentTypes = await response.json()
    console.log(`Total incident types fetched: ${Array.isArray(incidentTypes) ? incidentTypes.length : 'NOT AN ARRAY'}`)

    if (!Array.isArray(incidentTypes)) {
      console.error(`ERROR: Response is not an array, it's a ${typeof incidentTypes}`)
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(incidentTypes), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-incident-types-v2:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

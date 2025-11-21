import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

console.log("STEL Incident States V2 function loaded")

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
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
      } catch (_e) {
        // Ignore JSON parse errors
      }
    }

    console.log(`Fetching all incident states with limit=${limit}`)

    const apiUrl = `https://app.stelorder.com/app/incidentStates?limit=${limit}`

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const incidentStates = await response.json()
    
    if (!Array.isArray(incidentStates)) {
      console.error(`ERROR: Response is not an array, it's a ${typeof incidentStates}`)
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(incidentStates), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-incident-states-v2:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

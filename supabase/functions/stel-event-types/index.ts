import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL EventTypes function loaded")

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

    console.log(`Fetching eventTypes with limit=${limit}`)

    const apiUrl = `https://app.stelorder.com/app/eventTypes?limit=${limit}`
    
    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const allEventTypes = await response.json()
    console.log(`Total eventTypes fetched: ${allEventTypes.length}`)
    
    // Filter: not deleted
    interface EventType {
      deleted?: boolean
      [key: string]: unknown
    }
    
    const filtered = allEventTypes.filter((et: EventType) => !et.deleted)

    console.log(`Filtered ${filtered.length}/${allEventTypes.length} eventTypes (not deleted)`)

    return new Response(JSON.stringify(filtered), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})


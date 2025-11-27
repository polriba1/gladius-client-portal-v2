import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

console.log("STEL Event Types V3 (Paginated) function loaded")

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 })
  }

  try {
    const stelApiKey = Deno.env.get("STEL_API_KEY")
    if (!stelApiKey) {
      throw new Error("STEL_API_KEY not set")
    }

    let limit = "500"
    
    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
      } catch (_e) {
        console.log("No JSON body received or invalid JSON, using defaults")
      }
    }

    console.log(`Fetching event types with pagination (limit=${limit})`)

    let allEventTypes: unknown[] = []
    let start = 0
    let hasMore = true
    const batchSize = parseInt(limit) || 500

    while (hasMore) {
      const apiUrl = `https://app.stelorder.com/app/eventTypes?limit=${batchSize}&start=${start}`
      console.log(`Calling STEL API: ${apiUrl}`)

      const response = await fetch(apiUrl, {
        headers: { APIKEY: stelApiKey },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`STEL API error ${response.status}: ${errorText}`)
        throw new Error(`API error: ${response.status}`)
      }

      const batch = await response.json()
      
      if (!Array.isArray(batch)) {
        console.error(`ERROR: Response is not an array, it's a ${typeof batch}`)
        break
      }

      console.log(`Fetched batch of ${batch.length} event types`)
      allEventTypes = [...allEventTypes, ...batch]

      if (batch.length < batchSize) {
        hasMore = false
      } else {
        start += batchSize
        if (start > 10000) {
          console.warn("Safety break: exceeded 10000 event types")
          hasMore = false
        }
      }
    }

    console.log(`Total event types fetched: ${allEventTypes.length}`)

    return new Response(JSON.stringify(allEventTypes), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-event-types-v3:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

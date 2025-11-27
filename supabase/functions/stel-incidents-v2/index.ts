import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Incidents V2 function loaded")

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
    let utcLastModificationDate = ""

    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
        utcLastModificationDate = body.utcLastModificationDate || ""
        console.log(`Request body: limit=${limit}, utcLastModificationDate=${utcLastModificationDate}`)
      } catch (_e) {
        console.log("No JSON body received, using defaults")
      }
    }

    // If no date provided, use 1 month ago
    if (!utcLastModificationDate) {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000')
    }

    console.log(`Fetching incidents with pagination (limit=${limit}, utc-last-modification-date=${utcLastModificationDate})`)

    let allIncidents: unknown[] = []
    let offset = 0
    let hasMore = true
    const batchSize = parseInt(limit) || 500

    while (hasMore) {
      const apiUrl = `https://app.stelorder.com/app/incidents?limit=${batchSize}&offset=${offset}&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`
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

      console.log(`Fetched batch of ${batch.length} incidents`)
      allIncidents = [...allIncidents, ...batch]

      if (batch.length < batchSize) {
        hasMore = false
      } else {
        offset += batchSize
        // Safety break to avoid infinite loops
        if (offset > 10000) {
          console.warn("Safety break: exceeded 10000 incidents")
          hasMore = false
        }
      }
    }

    console.log(`Total incidents fetched: ${allIncidents.length}`)

    return new Response(JSON.stringify(allIncidents), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-incidents-v2:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Events function loaded")

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
    let startDate = ""
    let endDate = ""

    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
        startDate = body.startDate || ""
        endDate = body.endDate || ""
        console.log(`Request body: limit=${limit}, startDate=${startDate}, endDate=${endDate}`)
      } catch (_e) {
        console.log("No JSON body received, using defaults")
      }
    }

    // Build API URL with filters
    let apiUrl = `https://app.stelorder.com/app/events?limit=${limit}`
    
    if (startDate) {
      apiUrl += `&start-date=${encodeURIComponent(startDate)}`
    }
    
    if (endDate) {
      apiUrl += `&end-date=${encodeURIComponent(endDate)}`
    }
    
    console.log(`Fetching events from: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const allEvents = await response.json()
    console.log(`Total events fetched: ${allEvents.length}`)
    
    // Filter: not deleted
    interface Event {
      deleted?: boolean
      "start-date"?: string
      [key: string]: unknown
    }
    
    const filtered = allEvents.filter((ev: Event) => {
      if (ev.deleted) return false
      if (!ev["start-date"]) return false
      return true
    })

    console.log(`Filtered ${filtered.length}/${allEvents.length} events (not deleted, with start-date)`)

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


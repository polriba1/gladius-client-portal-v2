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

    console.log(`Fetching events with limit=${limit}, utc-last-modification-date=${utcLastModificationDate}`)

    const apiUrl = `https://app.stelorder.com/app/events?limit=${limit}&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`

    console.log(`Calling STEL API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const events = await response.json()
    console.log(`Total events fetched: ${Array.isArray(events) ? events.length : 'NOT AN ARRAY'}`)

    if (!Array.isArray(events)) {
      console.error(`ERROR: Response is not an array, it's a ${typeof events}`)
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(events), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-events:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

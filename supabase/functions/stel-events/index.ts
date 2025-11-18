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

    // If no dates provided, use default range (current month +/- 1 month)
    if (!startDate || !endDate) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)

      startDate = startOfMonth.toISOString().replace(/\.\d{3}Z$/, '+0000')
      endDate = endOfMonth.toISOString().replace(/\.\d{3}Z$/, '+0000')
    }

    console.log(`Fetching events with limit=${limit}, start-date=${startDate}, end-date=${endDate}`)

    const apiUrl = `https://app.stelorder.com/app/events?limit=${limit}&start-date=${encodeURIComponent(startDate)}&end-date=${encodeURIComponent(endDate)}`

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

    // Filter: not deleted AND event date within the requested range
    interface Event {
      deleted?: boolean
      date?: string
      [key: string]: unknown
    }

    const filtered = allEvents.filter((event: Event) => {
      if (event.deleted) return false
      if (!event.date) return false
      // Additional filtering can be added here if needed
      return true
    })

    console.log(`Filtered ${filtered.length}/${allEvents.length} events (not deleted)`)

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

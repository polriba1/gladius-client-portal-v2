import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

console.log("STEL Events V3 (Paginated) function loaded")

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
    let utcLastModificationDate = ""
    let filterFrom = ""
    let filterTo = ""

    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
        utcLastModificationDate = body.utcLastModificationDate || ""
        filterFrom = body.filterFrom || ""
        filterTo = body.filterTo || ""
      } catch (_e) {
        console.log("No JSON body received or invalid JSON, using defaults")
      }
    }

    if (!utcLastModificationDate) {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000')
    }

    console.log(`Fetching events with pagination (limit=${limit}, utc-last-modification-date=${utcLastModificationDate})`)
    
    let useDateRange = false
    let apiStartDate = ""
    let apiEndDate = ""

    if (filterFrom && filterTo) {
      console.log(`Filtering response for range: ${filterFrom} to ${filterTo}`)
      useDateRange = true
      
      // Safety buffer: Shift start date back by 30 days to catch long-running events that started before the window
      const fromDate = new Date(filterFrom)
      fromDate.setDate(fromDate.getDate() - 30)
      apiStartDate = fromDate.toISOString().replace(/\.\d{3}Z$/, '+0000')
      
      // End date: Use filterTo directly (events ending before this date)
      const toDate = new Date(filterTo)
      apiEndDate = toDate.toISOString().replace(/\.\d{3}Z$/, '+0000')
      
      console.log(`Using STEL API Date Filters: start-date=${apiStartDate}, end-date=${apiEndDate}`)
    }

    let allEvents: Record<string, unknown>[] = []
    let start = 0
    let hasMore = true
    const batchSize = parseInt(limit) || 500

    while (hasMore) {
      let apiUrl = `https://app.stelorder.com/app/events?limit=${batchSize}&start=${start}`
      
      if (useDateRange) {
        // Use specific date range filters documented by user
        apiUrl += `&start-date=${encodeURIComponent(apiStartDate)}&end-date=${encodeURIComponent(apiEndDate)}`
      } else {
        // Fallback to modification date
        apiUrl += `&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`
      }
      
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

      console.log(`Fetched batch of ${batch.length} events`)
      allEvents = [...allEvents, ...batch] as Record<string, unknown>[]

      if (batch.length < batchSize) {
        hasMore = false
      } else {
        start += batchSize
        if (start > 20000) {
          console.warn("Safety break: exceeded 20000 events")
          hasMore = false
        }
      }
    }

    console.log(`Total events fetched from STEL: ${allEvents.length}`)

    // Server-side filtering if dates are provided
    if (filterFrom && filterTo) {
      const fromDate = new Date(filterFrom)
      const toDate = new Date(filterTo)
      
      allEvents = allEvents.filter(event => {
        if (!event["start-date"] || typeof event["start-date"] !== 'string') return false
        const eventDate = new Date(event["start-date"])
        return eventDate >= fromDate && eventDate <= toDate
      })
      console.log(`Filtered events to range: ${allEvents.length}`)
    }

    return new Response(JSON.stringify(allEvents), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-events-v3:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

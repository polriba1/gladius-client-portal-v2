import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Incidents function loaded")

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
    let daysBack = 30

    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
        daysBack = body.daysBack || 30
        console.log(`Request body: limit=${limit}, daysBack=${daysBack}`)
      } catch (_e) {
        console.log("No JSON body received, using defaults")
      }
    }

    // Calculate the date for filtering (1 month ago)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000')
    
    console.log(`Fetching incidents with limit=${limit}, utc-last-modification-date=${utcLastModificationDate}`)

    const apiUrl = `https://app.stelorder.com/app/incidents?limit=${limit}&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`
    
    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const allIncidents = await response.json()
    console.log(`Total incidents fetched: ${allIncidents.length}`)
    
    // Filter: not deleted AND incident date between 1 month ago and 1 month ahead
    const oneMonthAgoDate = new Date()
    oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1)
    const oneMonthAheadDate = new Date()
    oneMonthAheadDate.setMonth(oneMonthAheadDate.getMonth() + 1)
    
    interface Incident {
      deleted?: boolean
      date?: string
      [key: string]: unknown
    }
    
    const filtered = allIncidents.filter((inc: Incident) => {
      if (inc.deleted) return false
      if (!inc.date) return false
      const incidentDate = new Date(inc.date)
      return incidentDate >= oneMonthAgoDate && incidentDate <= oneMonthAheadDate
    })

    console.log(`Filtered ${filtered.length}/${allIncidents.length} incidents (not deleted, -1 month to +1 month)`)

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

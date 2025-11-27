import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

console.log("STEL Incidents V3 (Paginated) function loaded")

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
    let ids: (string | number)[] = []

    if (req.method === "POST") {
      try {
        const body = await req.json()
        limit = body.limit || "500"
        utcLastModificationDate = body.utcLastModificationDate || ""
        filterFrom = body.filterFrom || ""
        filterTo = body.filterTo || ""
        ids = body.ids || []
      } catch (_e) {
        console.log("No JSON body received or invalid JSON, using defaults")
      }
    }

    // MODE 1: Fetch specific IDs (Robust WhatsApp Generation)
    if (ids.length > 0) {
      console.log(`Fetching ${ids.length} specific incidents by ID...`)
      const incidents: Record<string, unknown>[] = []
      
      // Fetch in parallel with concurrency limit of 5
      const chunkArray = (arr: (string | number)[], size: number) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
          arr.slice(i * size, i * size + size)
        )
      }
      
      const chunks = chunkArray(ids, 5)
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (id) => {
          try {
            const apiUrl = `https://app.stelorder.com/app/incidents/${id}`
            console.log(`Calling STEL API: ${apiUrl}`)
            
            const response = await fetch(apiUrl, {
              headers: { APIKEY: stelApiKey },
            })
            
            if (response.ok) {
              const data = await response.json()
              // Handle if API returns array or single object
              if (Array.isArray(data)) {
                 if (data.length > 0) incidents.push(data[0])
              } else if (data) {
                 incidents.push(data)
              }
            } else {
              console.warn(`Failed to fetch incident ${id}: ${response.status}`)
            }
          } catch (e) {
            console.error(`Error fetching incident ${id}:`, e)
          }
        }))
      }
      
      console.log(`Successfully fetched ${incidents.length} incidents by ID`)
      
      return new Response(JSON.stringify(incidents), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // MODE 2: Fetch by Date Range (Calendar View)
    if (!utcLastModificationDate) {
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      utcLastModificationDate = oneMonthAgo.toISOString().replace(/\.\d{3}Z$/, '+0000')
    }

    console.log(`Fetching incidents with pagination (limit=${limit}, utc-last-modification-date=${utcLastModificationDate})`)
    if (filterFrom && filterTo) {
      console.log(`Filtering response for range: ${filterFrom} to ${filterTo}`)
    }

    let allIncidents: Record<string, unknown>[] = []
    let start = 0
    let hasMore = true
    const batchSize = parseInt(limit) || 500

    while (hasMore) {
      const apiUrl = `https://app.stelorder.com/app/incidents?limit=${batchSize}&start=${start}&utc-last-modification-date=${encodeURIComponent(utcLastModificationDate)}`
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
      allIncidents = [...allIncidents, ...batch] as Record<string, unknown>[]

      if (batch.length < batchSize) {
        hasMore = false
      } else {
        start += batchSize
        if (start > 20000) {
          console.warn("Safety break: exceeded 20000 incidents")
          hasMore = false
        }
      }
    }

    console.log(`Total incidents fetched from STEL: ${allIncidents.length}`)

    // Server-side filtering if dates are provided
    if (filterFrom && filterTo) {
      const fromDate = new Date(filterFrom)
      const toDate = new Date(filterTo)
      
      allIncidents = allIncidents.filter(incident => {
        if (!incident.date || typeof incident.date !== 'string') return false
        const incidentDate = new Date(incident.date)
        return incidentDate >= fromDate && incidentDate <= toDate
      })
      console.log(`Filtered incidents to range: ${allIncidents.length}`)
    }

    return new Response(JSON.stringify(allIncidents), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-incidents-v3:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

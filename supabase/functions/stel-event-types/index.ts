import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Event Types function loaded")

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

    let ids: number[] = []

    if (req.method === "POST") {
      try {
        const body = await req.json()
        ids = body.ids || []
        console.log(`Request body: ids=${ids.join(', ')}`)
      } catch (_e) {
        console.log("No JSON body received, returning empty array")
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    console.log(`Fetching event types${ids.length > 0 ? `: ${ids.join(', ')}` : ' (all)'}`)

    let result: any[] = []

    if (ids.length > 0) {
      // Fetch each event type individually by ID using correct endpoint
      console.log(`Fetching ${ids.length} event types individually...`)
      
      for (const id of ids) {
        try {
          const apiUrl = `https://app.stelorder.com/app/eventTypes/${id}`
          console.log(`Fetching event type ${id} from ${apiUrl}`)
          
          const response = await fetch(apiUrl, {
            headers: { APIKEY: stelApiKey },
          })

          if (response.ok) {
            const eventType = await response.json()
            // API returns an array with single element
            const eventTypeData = Array.isArray(eventType) ? eventType[0] : eventType
            if (eventTypeData) {
              result.push(eventTypeData)
              console.log(`✅ Fetched event type ${id}: ${eventTypeData.name}`)
            }
          } else if (response.status === 404) {
            console.warn(`⚠️ Event type ${id} not found (404)`)
          } else {
            const errorText = await response.text()
            console.error(`❌ Error fetching event type ${id}: ${response.status} - ${errorText}`)
          }
        } catch (error) {
          console.error(`❌ Exception fetching event type ${id}:`, error)
        }
      }
      
      console.log(`Successfully fetched ${result.length}/${ids.length} event types`)
    } else {
      // Fetch all event types
      console.log(`Fetching all event types with limit=500`)
      const apiUrl = `https://app.stelorder.com/app/eventTypes?limit=500`

      const response = await fetch(apiUrl, {
        headers: { APIKEY: stelApiKey },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`STEL API error ${response.status}: ${errorText}`)
        throw new Error(`API error: ${response.status}`)
      }

      result = await response.json()
      console.log(`Total event types fetched: ${result.length}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

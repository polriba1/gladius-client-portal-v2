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

    // STEL API call to get event types
    const apiUrl = `https://app.stelorder.com/app/event-types`

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const allEventTypes = await response.json()
    console.log(`Total event types fetched: ${allEventTypes.length}`)

    // Filter by requested IDs if provided, otherwise return all
    let result: any[];
    if (ids.length > 0) {
      result = allEventTypes.filter((eventType: any) => {
        return ids.includes(eventType.id)
      })
      console.log(`Filtered ${result.length}/${allEventTypes.length} event types by requested IDs`)
    } else {
      result = allEventTypes
      console.log(`Returning all ${allEventTypes.length} event types`)
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

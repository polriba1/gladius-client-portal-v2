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
      } catch (_e) {}
    }

    const response = await fetch(`https://app.stelorder.com/app/incidents?limit=${limit}`, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const allIncidents = await response.json()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    
    const filtered = allIncidents.filter((inc: any) => {
      const date = inc["creation-date"]
      return date && new Date(date) >= cutoffDate
    })

    console.log(`Filtered ${filtered.length}/${allIncidents.length} incidents`)

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

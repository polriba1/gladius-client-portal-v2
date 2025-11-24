import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

console.log("STEL Address V2 function loaded")

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 })
  }

  try {
    const stelApiKey = Deno.env.get("STEL_API_KEY")
    if (!stelApiKey) {
      console.error("STEL_API_KEY not set")
      throw new Error("STEL_API_KEY not set")
    }

    let addressId = ""

    if (req.method === "POST") {
      try {
        const body = await req.json()
        addressId = body.addressId ? String(body.addressId).trim() : ""
        console.log(`Request body: addressId=${addressId}`)
      } catch (e) {
        console.error("Error parsing JSON body:", e)
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    if (!addressId) {
      return new Response(JSON.stringify({ error: "addressId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log(`Fetching address ${addressId}`)

    const apiUrl = `https://app.stelorder.com/app/addresses/${addressId}`

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Address ${addressId} not found (404)`)
        return new Response(JSON.stringify({ error: "Address not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const addressData = await response.json()
    const address = Array.isArray(addressData) ? addressData[0] : addressData

    console.log(`Address ${addressId} fetched successfully`)

    return new Response(JSON.stringify(address), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-address-v2:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})


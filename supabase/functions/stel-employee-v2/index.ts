import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Employee V2 function loaded")

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

    let employeeId = ""

    if (req.method === "POST") {
      try {
        const body = await req.json()
        employeeId = body.employeeId || ""
        console.log(`Request body: employeeId=${employeeId}`)
      } catch (_e) {
        console.log("No JSON body received")
        return new Response(JSON.stringify({ error: "employeeId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    if (!employeeId) {
      return new Response(JSON.stringify({ error: "employeeId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.log(`Fetching employee ${employeeId}`)

    const apiUrl = `https://app.stelorder.com/app/employees/${employeeId}`

    const response = await fetch(apiUrl, {
      headers: { APIKEY: stelApiKey },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Employee ${employeeId} not found (404)`)
        return new Response(JSON.stringify({ error: "Employee not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const errorText = await response.text()
      console.error(`STEL API error ${response.status}: ${errorText}`)
      throw new Error(`API error: ${response.status}`)
    }

    const employeeData = await response.json()
    const employee = Array.isArray(employeeData) ? employeeData[0] : employeeData

    console.log(`Employee ${employeeId} fetched successfully`)

    return new Response(JSON.stringify(employee), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in stel-employee-v2:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})


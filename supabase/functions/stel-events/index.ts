/// <reference types="https://deno.land/x/types/index.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("STEL Events function loaded")

serve(async (req: Request) => {
  console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`)

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, x-supabase-auth',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] Handling OPTIONS preflight request`)
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    })
  }

  try {
    console.log('Processing request:', req.method, req.url)

    // Get the API key from environment variables
    const stelApiKey = Deno.env.get('STEL_API_KEY')
    if (!stelApiKey) {
      console.error('STEL_API_KEY environment variable not set')
      throw new Error('STEL_API_KEY environment variable not set')
    }

    // Get parameters from request body (sent by supabase.functions.invoke) or query params
    let limit = '100'

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        limit = body.limit || '100'
        console.log('📨 Request body:', body)
      } catch (_e) {
        console.log('📨 No JSON body or invalid JSON, checking query params')
        // Fallback to query parameters if no body
        const url = new URL(req.url)
        limit = url.searchParams.get('limit') || '100'
      }
    } else {
      // For GET requests, use query parameters
      const url = new URL(req.url)
      limit = url.searchParams.get('limit') || '100'
    }

    console.log('🔧 Edge Function Parameters:', { limit })

    // Build the STEL Order API URL
    let stelUrl = 'https://app.stelorder.com/app/events'
    const params = new URLSearchParams()

    if (limit) {
      params.append('limit', limit)
    }

    if (params.toString()) {
      stelUrl += '?' + params.toString()
    }

    console.log('🌐 STEL Order API Request:', {
      url: stelUrl,
      method: 'GET',
      headers: {
        APIKEY: stelApiKey ? '[PRESENT]' : '[MISSING]',
        'Content-Type': 'application/json'
      }
    })

    console.log('Fetching from STEL Order API:', stelUrl)

    // Make the request to STEL Order API
    const response = await fetch(stelUrl, {
      method: 'GET',
      headers: {
        'APIKEY': stelApiKey,
        'Content-Type': 'application/json',
      },
    })

    console.log('🌐 STEL Order API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ STEL Order API error:', response.status, errorText)
      throw new Error(`STEL Order API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    
    // Log the full structure of the response
    console.log('✅ STEL Order API Response Structure:')
    console.log('📊 Response Type:', Array.isArray(data) ? 'Array' : typeof data)
    console.log('📊 Total Count:', Array.isArray(data) ? data.length : 'N/A')
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('📋 First Item Fields:', Object.keys(data[0]))
      console.log('🔍 First Item Complete Structure:')
      console.log(JSON.stringify(data[0], null, 2))
      
      if (data.length > 1) {
        console.log('🔍 Second Item Complete Structure:')
        console.log(JSON.stringify(data[1], null, 2))
      }
      
      console.log('📦 Sample of first 3 items:', data.slice(0, 3))
    } else if (!Array.isArray(data)) {
      console.log('🔍 Complete Response Structure:')
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.log('⚠️ Response is an empty array')
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in stel-events function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorDetails = error instanceof Error ? error.toString() : String(error)

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    )
  }
})
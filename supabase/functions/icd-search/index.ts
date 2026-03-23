import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  // ✅ Handle CORS preflight (OPTIONS request)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("q");

  // Step 1: get token from WHO ICD API
  const tokenRes = await fetch("https://icdaccessmanagement.who.int/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: Deno.env.get("ICD_CLIENT_ID"),       // set in Supabase Secrets
      client_secret: Deno.env.get("ICD_CLIENT_SECRET"), // set in Supabase Secrets
      scope: "icdapi_access",
    }),
  });

  const tokenData = await tokenRes.json();
  console.log("WHO ICD token response:", tokenData);

  // If token request failed, return immediately with debug info
  if (!tokenData.access_token) {
    return new Response(JSON.stringify({
      error: "Failed to obtain WHO ICD token",
      details: tokenData,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      status: 401,
    });
  }

  // Step 2: ICD-11 search
  const searchRes = await fetch(
    `https://id.who.int/icd/release/11/mms/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${tokenData.access_token}`,
        "API-Version": "v2", // ✅ must be quoted
      },
    }
  );

  const searchData = await searchRes.json();

  // ✅ Return with CORS headers
  return new Response(JSON.stringify(searchData), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
});

// netlify/functions/icd-search.js
export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  const tokenRes = await fetch("https://icdaccessmanagement.who.int/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.ICD_CLIENT_ID,
      client_secret: process.env.ICD_CLIENT_SECRET,
      scope: "icdapi_access",
    }),
  });

 
 console.log("Client ID:", process.env.ICD_CLIENT_ID);
console.log("Client Secret:", process.env.ICD_CLIENT_SECRET);

 
  const tokenData = await tokenRes.json();

  return {
    statusCode: tokenData.access_token ? 200 : 401,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(tokenData),
  };
}

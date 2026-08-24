export default {
  async fetch(request: Request) {
    console.log("=== ESA FUNCTION TRIGGERED ===", request.url)
    return new Response(JSON.stringify({ 
      ok: true, 
      url: request.url,
      time: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  }
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return response.status(204).end();
  }

  response.setHeader("Access-Control-Allow-Origin", "*");

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: "Missing GEOAPIFY_API_KEY" });
  }

  const { address } = request.body || {};
  if (!address) {
    return response.status(400).json({ error: "Missing address" });
  }

  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    address
  )}&format=json&apiKey=${apiKey}`;

  const apiResponse = await fetch(url);
  if (!apiResponse.ok) {
    return response
      .status(502)
      .json({ error: `Geoapify error: ${apiResponse.status}` });
  }

  const data = await apiResponse.json();
  const first = data?.results?.[0];
  if (!first || first.lat == null || first.lon == null) {
    return response.status(404).json({ error: "No coordinates found" });
  }

  return response.status(200).json({ lat: first.lat, lon: first.lon });
}

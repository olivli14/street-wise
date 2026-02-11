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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  const { question, listing } = request.body || {};
  if (!question) {
    return response.status(400).json({ error: "Missing question" });
  }

  const systemPrompt =
    "You are a helpful real estate assistant. Answer using only the provided " +
    "listing context. If data is missing, say so.";

  const userPrompt = `Listing context:
${JSON.stringify(listing || {}, null, 2)}

User question:
${question}`;

  const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!apiResponse.ok) {
    return response
      .status(502)
      .json({ error: `OpenAI error: ${apiResponse.status}` });
  }

  const data = await apiResponse.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();

  return response.status(200).json({ answer: answer || "No response." });
}

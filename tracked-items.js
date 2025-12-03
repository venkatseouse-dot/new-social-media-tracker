module.exports = async function handler(req, res) {
  const { method } = req;
  const userId = req.query.userId || "default_user";

  // Get Upstash Redis REST credentials from Vercel env variables
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Enable CORS for browser requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    if (method === "GET") {
      // Get tracked items from Upstash Redis
      const url = `${redisUrl}/get/tracker:${userId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const data = await response.json();
      let value = [];
      if (data?.result) value = JSON.parse(data.result);
      res.status(200).json(value);
    } else if (method === "POST") {
      // Save tracked items to Upstash Redis
      const { items } = req.body;
      const url = `${redisUrl}/set/tracker:${userId}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: JSON.stringify(items) }),
      });
      res.status(201).json({ message: "Saved to cloud", count: items.length });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("Cloud sync error:", err);
    res.status(500).json({ error: err.message });
  }
}

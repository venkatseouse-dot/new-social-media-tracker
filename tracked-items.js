module.exports = async (req, res) => {
  const { method } = req;
  const userId = req.query.userId || "default_user";

  // Get Upstash Redis credentials
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (!redisUrl || !redisToken) {
    return res.status(500).json({ error: "Database not configured" });
  }

  try {
    if (method === "GET") {
      // Get data from Redis
      const response = await fetch(`${redisUrl}/get/tracker:${userId}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
      });
      const data = await response.json();
      const items = data?.result ? JSON.parse(data.result) : [];
      res.status(200).json(items);
    } 
    else if (method === "POST") {
      // Save data to Redis
      const { items } = req.body;
      await fetch(`${redisUrl}/set/tracker:${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: JSON.stringify(items || []) }),
      });
      res.status(201).json({ message: "Saved to database", count: items?.length || 0 });
    } 
    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Database error" });
  }
}

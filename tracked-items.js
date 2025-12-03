module.exports = (req, res) => {
  const { method } = req;
  const userId = req.query.userId || "default_user";

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Simple in-memory storage for now (will reset on deployment)
  const storage = global.storage || (global.storage = {});

  if (method === "GET") {
    const data = storage[userId] || [];
    res.status(200).json(data);
  } else if (method === "POST") {
    const { items } = req.body;
    storage[userId] = items || [];
    res.status(201).json({ message: "Saved", count: items?.length || 0 });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

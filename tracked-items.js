module.exports = async (req, res) => {
  const { method } = req;

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Simple API endpoints for local development
  if (method === "GET") {
    res.status(200).json([]);
  } 
  else if (method === "POST") {
    res.status(201).json({ message: "Data received", count: 0 });
  } 
  else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

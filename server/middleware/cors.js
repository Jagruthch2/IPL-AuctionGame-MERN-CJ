const handleCORS = (req, res, next) => {
  // Set CORS headers
  const origin = req.headers.origin;
  
  // Allow the specific origin or any origin if CORS_ALLOW_ALL is true
  if (process.env.CORS_ALLOW_ALL === 'true') {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin) {
    // Check if origin is allowed
    const allowedOrigins = [
      "http://localhost:5173", 
      "http://localhost:5174", 
      "https://dazzling-mochi-d70ba6.netlify.app",
      "https://ipl-auctiongame-mern-cj.onrender.com"
    ];
    
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

module.exports = handleCORS;

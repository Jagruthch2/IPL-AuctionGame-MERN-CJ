const handleCORS = (req, res, next) => {
  // Set CORS headers
  const origin = req.headers.origin;
  
  // Define all allowed origins
  const allowedOrigins = [
    "http://localhost:5173", 
    "http://localhost:5174", 
    "https://dazzling-mochi-d70ba6.netlify.app",
    "https://tubular-cascaron-da9fc9.netlify.app",
    "https://ipl-auctiongame-mern-cj.onrender.com"
  ];
  
  // Add CLIENT_URL if defined in environment variables
  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }

  // Allow the specific origin or any origin if CORS_ALLOW_ALL is true
  if (process.env.CORS_ALLOW_ALL === 'true') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    // Allow the specific origin that made the request
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    // Log unrecognized origins for debugging
    console.log(`Unrecognized origin: ${origin}`);
    // Default to the Netlify URL since that's what's having issues
    res.setHeader('Access-Control-Allow-Origin', 'https://tubular-cascaron-da9fc9.netlify.app');
  }
  
  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
};

module.exports = handleCORS;

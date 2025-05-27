const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration - Railway compatible
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://frontend-production-416d.up.railway.app',
      'https://backend-production-416d.up.railway.app'
    ];
    
    // Check if origin is allowed or if it's a Railway subdomain
    if (allowedOrigins.includes(origin) || origin.endsWith('.up.railway.app')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware (ONLY ONCE)
app.use(cors(corsOptions));

// Basic middleware
app.use(express.json());

// Add some debugging for CORS issues
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'physical-security-news-aggregator',
    cors: 'enabled'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Physical Security News Aggregator API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      articles: '/api/articles'
    },
    cors: 'configured'
  });
});

// Articles endpoint
app.get('/api/articles', (req, res) => {
  // Add CORS debug info
  console.log('Articles request from origin:', req.headers.origin);
  
  res.json({
    articles: [
      {
        title: "Sample Security Article",
        source: "Security News",
        summary: "This is a placeholder article. Real articles will appear once the scraper is configured.",
        category: "Physical Security",
        publishedAt: new Date().toISOString()
      }
    ],
    message: 'Sample data - Scraper will run daily at 6 AM to fetch real articles.',
    count: 1,
    page: parseInt(req.query.page) || 1,
    totalPages: 1
  });
});

// CORS preflight handler for any missed OPTIONS requests
app.options('*', (req, res) => {
  console.log('OPTIONS request for:', req.path, 'from:', req.headers.origin);
  res.status(200).end();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Backend API is ready!');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Articles API: http://localhost:${PORT}/api/articles`);
  console.log('CORS enabled for Railway deployment');
});

app.server = server;
module.exports = app;
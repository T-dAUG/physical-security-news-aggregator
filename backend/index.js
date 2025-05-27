const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'physical-security-news-aggregator'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Physical Security News Aggregator API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      articles: '/api/articles'
    }
  });
});

// Articles endpoint - handles both with and without query parameters
app.get('/api/articles', (req, res) => {
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// CRITICAL: Bind to 0.0.0.0 for Docker
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Backend API is ready!');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Articles API: http://localhost:${PORT}/api/articles`);
});

module.exports = app;
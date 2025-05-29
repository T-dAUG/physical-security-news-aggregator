const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:4000',
    'http://localhost:5173', 
    'https://frontend-production-416d.up.railway.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parser
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Physical Security News Aggregator API',
    status: 'running',
    version: '1.0.0'
  });
});

// Articles API endpoint
app.get('/api/articles', (req, res) => {
  res.json({
    message: 'Articles endpoint',
    articles: []
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Backend API is ready!');
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Articles API: http://localhost:${PORT}/api/articles`);
});

module.exports = app;
const express = require('express');
const cors = require('cors');

const app = express();
// Manual CORS headers - add this early in app.js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://frontend-production-416d.up.railway.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
// Add CORS configuration
app.use(cors({
  origin: [
    'https://frontend-production-416d.up.railway.app',
    'http://localhost:5173',
    'http://localhost:4000',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ... rest of your existing code
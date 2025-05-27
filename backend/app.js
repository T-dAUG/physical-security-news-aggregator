const express = require('express');
const cors = require('cors');

const app = express();

// Add CORS configuration
app.use(cors({
  origin: [
    'https://frontend-production-416d.up.railway.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ... rest of your existing code
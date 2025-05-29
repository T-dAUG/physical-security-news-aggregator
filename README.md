# 🛡️ Physical Security News Aggregator

A comprehensive news aggregation platform focused on physical security topics, built with modern web technologies and automated deployment pipelines.

## 🌟 Features

- **Real-time News Aggregation**: Automated collection of physical security news from multiple sources
- **REST API**: Clean, well-documented API endpoints for accessing aggregated content
- **Modern Frontend**: React-based user interface with responsive design
- **Automated Testing**: Comprehensive test suites for both backend and frontend
- **CI/CD Pipeline**: Automated deployment with GitHub Actions and Railway
- **Security-First**: Built with security best practices and regular vulnerability scanning

## 🏗️ Architecture

- **Backend**: Node.js with Express.js
- **Frontend**: React with Vite and TailwindCSS
- **Database**: Redis for caching and data storage
- **Deployment**: Railway platform with Docker containers
- **Monitoring**: Built-in health checks and status monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/t-dAUG/physical-security-news-aggregator.git
   cd physical-security-news-aggregator
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up Environment Variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend  
   cp frontend/.env.example frontend/.env
   ```

NEW - # Physical Security News Aggregator

Automated pipeline that scrapes physical security news from Google search results and organizes them in Airtable.

## ✅ Current Status: WORKING
- Successfully processed 846 articles
- 25+ search terms covering crime stats, security tech, policy updates
- Smart categorization and field mapping

## Quick Start
```bash
node apify-to-airtable-CORRECTED.js "" [RUN_ID]

## 🏆 **Bottom Line:**

**Push the working version TODAY** → Then enhance in controlled iterations

Your current system is genuinely impressive and deserves to be version-controlled. The optimizations can come next as feature branches.

**Want me to help you set up a proper README or documentation for the GitHub push?** 📚

### Development

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000
   - Health Check: http://localhost:4000/health

## 📡 API Documentation

### Endpoints

- `GET /health` - Health check endpoint
- `GET /api/articles` - Retrieve aggregated news articles
- `GET /api/articles?page=1&limit=10` - Paginated articles

### Example Response

```json
{
  "articles": [
    {
      "title": "Security Industry Update",
      "source": "Security News",
      "summary": "Latest developments in physical security...",
      "category": "Physical Security",
      "publishedAt": "2025-05-27T16:00:00.000Z"
    }
  ],
  "count": 1,
  "page": 1,
  "totalPages": 1
}
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Run All Tests
```bash
npm run test:all
```

## 🚀 Deployment

### Railway Deployment

1. **Connect to Railway**
   ```bash
   railway login
   railway link
   ```

2. **Deploy**
   ```bash
   railway up
   ```

### Docker Deployment

1. **Build and Run**
   ```bash
   docker-compose up --build
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=4000
NODE_ENV=production
REDIS_URL=your_redis_url
API_RATE_LIMIT=100
```

#### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.railway.app
VITE_APP_NAME=Physical Security News
```

## 📊 Monitoring

- **Health Endpoint**: `/health` - Check service status
- **Status Dashboard**: Available at `/status` 
- **Logs**: Use `railway logs` for production logs

## 🛡️ Security

- Regular dependency vulnerability scanning
- Automated security updates via Dependabot  
- CORS protection and rate limiting
- Environment variable management
- Secure headers with Helmet.js

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/t-dAUG/physical-security-news-aggregator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/t-dAUG/physical-security-news-aggregator/discussions)

## 📈 Roadmap

- [ ] Advanced filtering and search capabilities
- [ ] Email notifications for critical security alerts  
- [ ] Mobile application
- [ ] Machine learning-powered content categorization
- [ ] Integration with more news sources
- [ ] Real-time notifications

---

**Built with ❤️ for the Physical Security Community**
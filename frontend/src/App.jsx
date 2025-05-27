import React, { useState, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-production-416d.up.railway.app';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Test API connection
    console.log('Using API URL:', API_BASE_URL);
    fetch(`${API_BASE_URL}/api/articles`)
      .then(response => {
        console.log('Response:', response);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Data received:', data);
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('API Error:', error);
        setError(error.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔒 Physical Security News Aggregator</h1>
        <p>Stay updated with the latest in physical security news</p>
      </header>

      <main className="main-content">
        {loading && (
          <div className="loading">
            <p>Loading articles...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>Error: {error}</p>
            <p>Backend API might not be connected yet.</p>
          </div>
        )}

        {!loading && !error && (
          <div className="articles-section">
            <h2>Latest Articles ({articles.length})</h2>

            {articles.length === 0 ? (
              <div className="no-articles">
                <p>No articles available yet.</p>
                <p>The scraper will run daily at 6 AM to fetch new content.</p>
              </div>
            ) : (
              <div className="articles-grid">
                {articles.map((article, index) => (
                  <article key={index} className="article-card">
                    <h3>{article.title}</h3>
                    <p className="article-source">{article.source}</p>
                    <p className="article-summary">{article.summary}</p>
                    <div className="article-meta">
                      <span className="category">{article.category}</span>
                      <span className="date">{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="system-status">
          <h3>System Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Backend API:</span>
              <span className={`status-indicator ${error ? 'error' : 'success'}`}>
                {error ? 'Disconnected' : 'Connected'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Next Scrape:</span>
              <span className="status-value">Daily at 6:00 AM</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
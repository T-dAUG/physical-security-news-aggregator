const request = require('supertest');
const app = require('../index');

describe('API Endpoints', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
      
    expect(response.body.status).toBe('OK');
    expect(response.body.service).toBe('physical-security-news-aggregator');
  });

  test('GET /api/articles should return articles', async () => {
    const response = await request(app)
      .get('/api/articles')
      .expect(200);
      
    expect(response.body.articles).toBeDefined();
    expect(response.body.articles.length).toBeGreaterThan(0);
    expect(response.body.count).toBe(1);
  });

  test('GET / should return API info', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
      
    expect(response.body.message).toBe('Physical Security News Aggregator API');
  });
});
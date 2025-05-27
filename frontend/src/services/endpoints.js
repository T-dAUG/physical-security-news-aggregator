import apiClient from './api';

export const articlesAPI = {
  getAll: (params = {}) => apiClient.get('/articles', { params }),
  getById: (id) => apiClient.get(`/articles/${id}`),
};

export const categoriesAPI = {
  getAll: () => apiClient.get('/categories'),
};

export const analyticsAPI = {
  getStats: () => apiClient.get('/analytics/stats'),
};

export const scrapeAPI = {
  manual: () => apiClient.post('/scrape/manual'),
  getStatus: () => apiClient.get('/scrape/status'),
};
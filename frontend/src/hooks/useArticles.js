import { useQuery } from '@tanstack/react-query';
import { articlesAPI } from '../services/endpoints';

export const useArticles = (filters = {}) => {
  return useQuery({
    queryKey: ['articles', filters],
    queryFn: async () => {
      const response = await articlesAPI.getAll(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  });
};

export const useArticle = (id) => {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const response = await articlesAPI.getById(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
import React, { useState } from 'react';
import { useArticles } from '../hooks/useArticles';
import ArticleCard from '../components/ArticleCard';
import CategoryFilter from '../components/CategoryFilter';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    page: 1,
    limit: 20
  });

  const { data: articlesData, isLoading, error, refetch } = useArticles(filters);

  const handleCategoryChange = (category) => {
    setFilters(prev => ({ ...prev, category, page: 1 }));
  };

  const handleSearch = (search) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };

  if (isLoading && filters.page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Failed to load articles</p>
          <button
            onClick={() => refetch()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const articles = articlesData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">News Dashboard</h1>
          <p className="text-gray-600">Stay updated with the latest news from multiple sources</p>
        </div>

        <SearchBar onSearch={handleSearch} />
        <CategoryFilter 
          selectedCategory={filters.category} 
          onCategoryChange={handleCategoryChange} 
        />

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">Try adjusting your search or category filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {articles.map((article, index) => (
                <ArticleCard key={`${article.id}-${index}`} article={article} />
              ))}
            </div>

            {articles.length >= filters.limit && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
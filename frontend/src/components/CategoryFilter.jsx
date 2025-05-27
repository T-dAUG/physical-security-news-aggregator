import React from 'react';
import { useCategories } from '../hooks/useCategories';

const CategoryFilter = ({ selectedCategory, onCategoryChange }) => {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) return <div className="animate-pulse h-10 bg-gray-200 rounded"></div>;
  if (error) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onCategoryChange('')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedCategory === ''
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        All Categories
      </button>
      
      {categories?.data?.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === category
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
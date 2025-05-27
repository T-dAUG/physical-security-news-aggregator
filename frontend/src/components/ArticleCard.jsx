import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const ArticleCard = ({ article }) => {
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
          {article.category}
        </span>
        <span className="text-gray-500 text-sm">{timeAgo}</span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-primary-600 cursor-pointer">
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          {article.title}
        </a>
      </h3>
      
      <p className="text-gray-600 mb-4 line-clamp-3">
        {article.summary}
      </p>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Source: {article.source}
        </span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          Read more →
        </a>
      </div>
      
      {article.keywords && article.keywords.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {article.keywords.slice(0, 5).map((keyword, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleCard;
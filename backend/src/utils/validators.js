const Joi = require('joi');

const articleSchema = Joi.object({
  title: Joi.string().required().min(5).max(200).trim(),
  content: Joi.string().required().min(50).trim(),
  url: Joi.string().uri().required(),
  category: Joi.string().required().valid(
    'technology', 'business', 'health', 'sports', 
    'politics', 'entertainment', 'general'
  ),
  publishedAt: Joi.date().required(),
  source: Joi.string().required().min(1).max(100),
  summary: Joi.string().optional().max(500),
  keywords: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  qualityScore: Joi.number().integer().min(1).max(10).optional(),
  processedAt: Joi.date().optional()
});

const sourceSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  url: Joi.string().uri().required(),
  actorId: Joi.string().required(),
  maxPages: Joi.number().integer().min(1).max(100).default(10),
  config: Joi.object().optional(),
  active: Joi.boolean().default(true)
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid(
    'title', 'publishedAt', 'category', 'source', 'qualityScore'
  ).default('publishedAt'),
  sortDirection: Joi.string().valid('asc', 'desc').default('desc')
});

const filterSchema = Joi.object({
  category: Joi.string().optional(),
  source: Joi.string().optional(),
  search: Joi.string().optional().min(2).max(100),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  minQuality: Joi.number().integer().min(1).max(10).optional()
});

const validateArticle = (article) => {
  const { error, value } = articleSchema.validate(article, { stripUnknown: true });
  if (error) {
    throw new Error(`Article validation failed: ${error.details[0].message}`);
  }
  return value;
};

const validateSource = (source) => {
  const { error, value } = sourceSchema.validate(source, { stripUnknown: true });
  if (error) {
    throw new Error(`Source validation failed: ${error.details[0].message}`);
  }
  return value;
};

const validatePagination = (params) => {
  const { error, value } = paginationSchema.validate(params);
  if (error) {
    throw new Error(`Pagination validation failed: ${error.details[0].message}`);
  }
  return value;
};

const validateFilters = (filters) => {
  const { error, value } = filterSchema.validate(filters, { stripUnknown: true });
  if (error) {
    throw new Error(`Filter validation failed: ${error.details[0].message}`);
  }
  return value;
};

const validateEmail = (email) => {
  const schema = Joi.string().email().required();
  const { error } = schema.validate(email);
  return !error;
};

const validateUrl = (url) => {
  const schema = Joi.string().uri().required();
  const { error } = schema.validate(url);
  return !error;
};

module.exports = {
  validateArticle,
  validateSource,
  validatePagination,
  validateFilters,
  validateEmail,
  validateUrl,
  articleSchema,
  sourceSchema,
  paginationSchema,
  filterSchema
};
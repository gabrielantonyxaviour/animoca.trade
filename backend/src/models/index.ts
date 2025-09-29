// Export all models
export * from './User.js';
export * from './Credential.js';
export * from './TokenGeneration.js';

// Type definitions for common operations
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SortOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListOptions extends PaginationOptions, SortOptions {}

// Helper function to calculate pagination
export function calculatePagination(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return { limit, offset };
}

// Response wrapper for paginated results
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
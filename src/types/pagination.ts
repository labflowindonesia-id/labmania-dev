/**
 * Pagination types for server-side pagination support
 */

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    [key: string]: string | number | undefined;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}

export const DEFAULT_PAGE_SIZE = 8;
export const DEFAULT_PAGE = 1;

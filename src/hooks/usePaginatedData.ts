import { useState, useCallback, useRef, useEffect } from 'react';

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface UsePaginatedDataOptions {
    /** Initial page size (default: 10) */
    initialLimit?: number;
    /** Debounce delay in ms (default: 400) */
    debounceMs?: number;
}

interface UsePaginatedDataReturn<T> {
    /** The current page of data */
    data: T[];
    /** Whether data is currently loading */
    loading: boolean;
    /** Current page number (1-indexed) */
    page: number;
    /** Current page size */
    limit: number;
    /** Total number of records */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Current search input value (not debounced) */
    search: string;
    /** Set the search value (debounced internally) */
    setSearch: (value: string) => void;
    /** Change page */
    setPage: (page: number) => void;
    /** Change page size (resets to page 1) */
    setLimit: (limit: number) => void;
    /** Force a data refetch */
    refetch: () => void;
    /** Range text like "1–10 of 42" */
    rangeText: string;
}

/**
 * Reusable hook for server-side paginated data fetching with debounced search.
 *
 * @param fetchFn - async function that returns PaginatedResponse given (page, limit, search)
 * @param options - optional config
 */
export function usePaginatedData<T>(
    fetchFn: (page: number, limit: number, search?: string) => Promise<PaginatedResponse<T>>,
    options: UsePaginatedDataOptions = {}
): UsePaginatedDataReturn<T> {
    const { initialLimit = 10, debounceMs = 400 } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimitState] = useState(initialLimit);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep fetchFn ref stable to avoid infinite re-renders
    const fetchFnRef = useRef(fetchFn);
    fetchFnRef.current = fetchFn;

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, debounceMs);
    }, [debounceMs]);

    const handleLimitChange = useCallback((newLimit: number) => {
        setLimitState(newLimit);
        setPage(1);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchFnRef.current(page, limit, debouncedSearch || undefined);
            setData(result.data || []);
            setTotal(result.total || 0);
            setTotalPages(result.totalPages || 1);
        } catch (error) {
            console.error('Paginated fetch error:', error);
            setData([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const from = data.length > 0 ? (page - 1) * limit + 1 : 0;
    const to = Math.min(page * limit, total);
    const rangeText = `Showing ${from}–${to} of ${total}`;

    return {
        data,
        loading,
        page,
        limit,
        total,
        totalPages,
        search,
        setSearch: handleSearchChange,
        setPage,
        setLimit: handleLimitChange,
        refetch: fetchData,
        rangeText,
    };
}

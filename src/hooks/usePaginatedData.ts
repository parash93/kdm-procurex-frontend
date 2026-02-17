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
 * The fetchFn receives an AbortSignal that MUST be forwarded to the HTTP client
 * (e.g. axios) so that duplicate requests caused by React StrictMode are properly
 * cancelled instead of just having their responses ignored.
 *
 * @param fetchFn - async function: (page, limit, search, signal) => PaginatedResponse
 * @param options - optional config
 */
export function usePaginatedData<T>(
    fetchFn: (page: number, limit: number, search: string | undefined, signal: AbortSignal) => Promise<PaginatedResponse<T>>,
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

    // Track a version counter so refetch() can bump it to trigger the effect
    const [fetchVersion, setFetchVersion] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const doFetch = async () => {
            setLoading(true);
            try {
                const result = await fetchFnRef.current(
                    page, limit, debouncedSearch || undefined, controller.signal
                );
                // No need for a separate `cancelled` flag — if aborted, axios
                // throws a CanceledError which lands in the catch block below.
                setData(result.data || []);
                setTotal(result.total || 0);
                setTotalPages(result.totalPages || 1);
            } catch (error: any) {
                // Ignore AbortController cancellations — they're expected
                if (error?.name === 'CanceledError' || error?.name === 'AbortError' || controller.signal.aborted) {
                    return;
                }
                console.error('Paginated fetch error:', error);
                setData([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        doFetch();

        return () => {
            controller.abort();
        };
    }, [page, limit, debouncedSearch, fetchVersion]);

    const refetch = useCallback(() => {
        setFetchVersion(v => v + 1);
    }, []);

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
        refetch,
        rangeText,
    };
}

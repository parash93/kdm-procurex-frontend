import { Group, Pagination, Select, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

const PAGE_SIZE_OPTIONS = [
    { value: '10', label: '10 per page' },
    { value: '20', label: '20 per page' },
    { value: '50', label: '50 per page' },
];

interface PaginationControlsProps {
    /** Current search value */
    search: string;
    /** Search change handler */
    onSearchChange: (value: string) => void;
    /** Placeholder text for search input */
    searchPlaceholder?: string;
    /** Current page size */
    limit: number;
    /** Page size change handler */
    onLimitChange: (limit: number) => void;
    /** Total number of pages */
    totalPages: number;
    /** Current page */
    page: number;
    /** Page change handler */
    onPageChange: (page: number) => void;
    /** Range text like "Showing 1–10 of 42" */
    rangeText: string;
}

/**
 * Reusable search bar + page-size selector + bottom pagination row.
 *
 * Usage:
 * ```tsx
 * <PaginationControls.SearchBar ... />
 * { table here }
 * <PaginationControls.Footer ... />
 * ```
 */

export function SearchBar({
    search,
    onSearchChange,
    searchPlaceholder = 'Search...',
    limit,
    onLimitChange,
}: Pick<PaginationControlsProps, 'search' | 'onSearchChange' | 'searchPlaceholder' | 'limit' | 'onLimitChange'>) {
    return (
        <Group mb="lg" justify="space-between" wrap="wrap">
            <TextInput
                placeholder={searchPlaceholder}
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => onSearchChange(e.currentTarget.value)}
                style={{ flex: 1, minWidth: 200 }}
                radius="md"
            />
            <Select
                data={PAGE_SIZE_OPTIONS}
                value={String(limit)}
                onChange={(val) => val && onLimitChange(Number(val))}
                w={150}
                radius="md"
                allowDeselect={false}
            />
        </Group>
    );
}

export function PaginationFooter({
    totalPages,
    page,
    onPageChange,
    rangeText,
}: Pick<PaginationControlsProps, 'totalPages' | 'page' | 'onPageChange' | 'rangeText'>) {
    if (totalPages <= 1) {
        return (
            <Group mt="lg">
                <Text size="sm" c="dimmed">{rangeText}</Text>
            </Group>
        );
    }

    return (
        <Group justify="space-between" align="center" mt="lg" wrap="wrap">
            <Text size="sm" c="dimmed">{rangeText}</Text>
            <Pagination
                total={totalPages}
                value={page}
                onChange={onPageChange}
                radius="md"
                withEdges
            />
        </Group>
    );
}

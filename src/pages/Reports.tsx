import {
    Box, Title, Text, Stack, Group, Paper, Select, Button, Table,
    Badge, Tabs, LoadingOverlay, Divider, SimpleGrid, ActionIcon, Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import '@mantine/dates/styles.css';
import {
    IconDownload, IconFilter, IconShoppingCart, IconTruck,
    IconRefresh, IconFileSpreadsheet,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { notifications } from "@mantine/notifications";

const PO_STATUSES = [
    'DRAFT', 'PENDING_L1', 'APPROVED_L1', 'REJECTED_L1', 'ORDER_PLACED',
    'PARTIALLY_DELIVERED', 'FULLY_DELIVERED', 'CLOSED', 'CANCELLED',
];

const DISPATCH_STATUSES = ['DRAFT', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'gray', PENDING_L1: 'yellow', APPROVED_L1: 'cyan', REJECTED_L1: 'red',
    ORDER_PLACED: 'blue', PARTIALLY_DELIVERED: 'orange', FULLY_DELIVERED: 'green',
    CLOSED: 'dark', CANCELLED: 'pink', PACKED: 'violet', SHIPPED: 'indigo',
    IN_TRANSIT: 'cyan', DELIVERED: 'teal', RETURNED: 'orange',
};

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function escapeCell(v: any): string {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function buildOrdersCSV(orders: any[]): string[][] {
    const header = [
        'PO Number', 'PO Date', 'Status', 'Division', 'Supplier',
        'Product', 'SKU', 'Category', 'Ordered Qty', 'Dispatched Qty',
        'Unit Price', 'Total Price', 'Expected Delivery', 'Remarks',
    ];
    const rows: string[][] = [header];
    orders.forEach(o => {
        (o.items || []).forEach((item: any) => {
            rows.push([
                o.poNumber,
                o.poDate ? new Date(o.poDate).toLocaleDateString() : '',
                o.status,
                o.division?.name || '',
                o.supplier?.companyName || '',
                item.product?.name || '',
                item.product?.sku || '',
                item.product?.category?.name || '',
                item.quantity,
                item.dispatchedQuantity || 0,
                item.unitPrice || '',
                item.totalPrice || '',
                item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString() : '',
                item.remarks || '',
            ]);
        });
    });
    return rows;
}

function buildDispatchesCSV(dispatches: any[]): string[][] {
    const header = [
        'Dispatch ID', 'Reference #', 'Status', 'Created Date',
        'Supplier', 'PO Number', 'Division',
        'Product', 'Dispatched Qty',
        'Stage', 'Stage Date', 'Stage Notes', 'Updated By',
    ];
    const rows: string[][] = [header];
    dispatches.forEach(d => {
        const stageMap: Record<string, { date: string; notes: string; user: string }> = {};
        (d.stageUpdates || []).forEach((s: any) => {
            stageMap[s.status] = {
                date: new Date(s.timestamp).toLocaleDateString(),
                notes: s.notes || '',
                user: s.updatedByUser?.username || '',
            };
        });

        const latestStage = d.stageUpdates?.[d.stageUpdates.length - 1];

        (d.items || []).forEach((item: any) => {
            rows.push([
                d.id,
                d.referenceNumber || '',
                d.status,
                new Date(d.createdAt).toLocaleDateString(),
                d.supplier?.companyName || '',
                item.poItem?.purchaseOrder?.poNumber || '',
                item.poItem?.purchaseOrder?.division?.name || '',
                item.poItem?.product?.name || '',
                item.quantity,
                latestStage?.status || '',
                latestStage ? new Date(latestStage.timestamp).toLocaleDateString() : '',
                latestStage?.notes || '',
                latestStage?.updatedByUser?.username || '',
            ]);
        });
    });
    return rows;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Reports() {
    const [tab, setTab] = useState<string | null>('orders');
    const [loading, setLoading] = useState(false);

    // Shared filter state
    const [supplierId, setSupplierId] = useState<string | null>(null);
    const [divisionId, setDivisionId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

    // Orders filters
    const [orderStatus, setOrderStatus] = useState<string | null>(null);

    // Dispatch filters
    const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

    // Results
    const [orderResults, setOrderResults] = useState<any[]>([]);
    const [dispatchResults, setDispatchResults] = useState<any[]>([]);
    const [hasFetched, setHasFetched] = useState(false);

    // Options for selects
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([api.getSuppliers(), api.getDivisions()]).then(([s, d]) => {
            setSuppliers(s.map((x: any) => ({ value: String(x.id), label: x.companyName })));
            setDivisions(d.map((x: any) => ({ value: String(x.id), label: x.name })));
        });
    }, []);

    const runReport = async () => {
        setLoading(true);
        setHasFetched(false);
        try {
            const fromStr = dateRange[0] ? dateRange[0].toISOString() : undefined;
            const toStr = dateRange[1] ? dateRange[1].toISOString() : undefined;

            if (tab === 'orders') {
                const data = await api.getOrdersReport({
                    status: orderStatus || undefined,
                    divisionId: divisionId ? Number(divisionId) : undefined,
                    supplierId: supplierId ? Number(supplierId) : undefined,
                    from: fromStr,
                    to: toStr,
                });
                setOrderResults(data);
            } else {
                const data = await api.getDispatchesReport({
                    status: dispatchStatus || undefined,
                    supplierId: supplierId ? Number(supplierId) : undefined,
                    from: fromStr,
                    to: toStr,
                });
                setDispatchResults(data);
            }
            setHasFetched(true);
        } catch {
            notifications.show({ color: 'red', title: 'Error', message: 'Failed to generate report' });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const now = new Date().toISOString().split('T')[0];
        if (tab === 'orders') {
            downloadCSV(buildOrdersCSV(orderResults), `orders_report_${now}.csv`);
        } else {
            downloadCSV(buildDispatchesCSV(dispatchResults), `dispatch_report_${now}.csv`);
        }
        notifications.show({ color: 'green', message: 'Report downloaded!' });
    };

    const resetFilters = () => {
        setOrderStatus(null); setDispatchStatus(null);
        setSupplierId(null); setDivisionId(null);
        setDateRange([null, null]);
        setHasFetched(false);
        setOrderResults([]); setDispatchResults([]);
    };

    const resultCount = tab === 'orders' ? orderResults.length : dispatchResults.length;

    return (
        <Box pb="xl" pos="relative">
            <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />
            <Stack gap="xl">

                {/* Header */}
                <Box>
                    <Group gap="sm" mb={4}>
                        <IconFileSpreadsheet size={28} color="var(--mantine-color-blue-6)" />
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Reports</Title>
                    </Group>
                    <Text c="dimmed" size="sm">Generate and download procurement reports with custom filters.</Text>
                </Box>

                {/* Report Type Tabs */}
                <Tabs value={tab} onChange={(v) => { setTab(v); resetFilters(); }}>
                    <Tabs.List>
                        <Tabs.Tab value="orders" leftSection={<IconShoppingCart size={16} />}>
                            Orders Report
                        </Tabs.Tab>
                        <Tabs.Tab value="dispatches" leftSection={<IconTruck size={16} />}>
                            Dispatch Report
                        </Tabs.Tab>
                    </Tabs.List>
                </Tabs>

                {/* Filters */}
                <Paper withBorder p="xl" radius="md" shadow="sm">
                    <Group mb="md" gap="sm">
                        <IconFilter size={18} />
                        <Text fw={700}>Filters</Text>
                    </Group>
                    <Divider mb="md" />
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                        {tab === 'orders' && (
                            <Select
                                label="Order Status"
                                placeholder="All statuses"
                                data={PO_STATUSES}
                                value={orderStatus}
                                onChange={setOrderStatus}
                                clearable
                            />
                        )}
                        {tab === 'dispatches' && (
                            <Select
                                label="Dispatch Status"
                                placeholder="All statuses"
                                data={DISPATCH_STATUSES}
                                value={dispatchStatus}
                                onChange={setDispatchStatus}
                                clearable
                            />
                        )}
                        {tab === 'orders' && (
                            <Select
                                label="Division"
                                placeholder="All divisions"
                                data={divisions}
                                value={divisionId}
                                onChange={setDivisionId}
                                clearable
                                searchable
                            />
                        )}
                        <Select
                            label="Supplier"
                            placeholder="All suppliers"
                            data={suppliers}
                            value={supplierId}
                            onChange={setSupplierId}
                            clearable
                            searchable
                        />
                        <DatePickerInput
                            type="range"
                            label="Date Range"
                            placeholder="Pick range"
                            value={dateRange}
                            onChange={setDateRange}
                            clearable
                        />
                    </SimpleGrid>

                    <Group mt="lg">
                        <Button leftSection={<IconFilter size={16} />} onClick={runReport}>
                            Generate Report
                        </Button>
                        <Tooltip label="Reset all filters">
                            <ActionIcon variant="subtle" onClick={resetFilters} size="lg">
                                <IconRefresh size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Paper>

                {/* Results */}
                {hasFetched && (
                    <Paper withBorder p="xl" radius="md" shadow="sm">
                        <Group justify="space-between" mb="lg">
                            <Group gap="sm">
                                <Text fw={700} size="lg">Results</Text>
                                <Badge size="lg" variant="light">{resultCount} {tab === 'orders' ? 'orders' : 'dispatches'}</Badge>
                            </Group>
                            <Button
                                leftSection={<IconDownload size={16} />}
                                color="teal"
                                onClick={handleDownload}
                                disabled={resultCount === 0}
                            >
                                Download CSV
                            </Button>
                        </Group>
                        <Divider mb="md" />

                        {/* Orders preview */}
                        {tab === 'orders' && (
                            <Table.ScrollContainer minWidth={700}>
                                <Table verticalSpacing="xs" striped highlightOnHover fz="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>PO Number</Table.Th>
                                            <Table.Th>Date</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Division</Table.Th>
                                            <Table.Th>Supplier</Table.Th>
                                            <Table.Th ta="center">Items</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {orderResults.length === 0 && (
                                            <Table.Tr>
                                                <Table.Td colSpan={6} ta="center">
                                                    <Text c="dimmed" size="sm">No orders match the selected filters.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                        {orderResults.map((o: any) => (
                                            <Table.Tr key={o.id}>
                                                <Table.Td><Text fw={600} c="blue">{o.poNumber}</Text></Table.Td>
                                                <Table.Td><Text size="xs">{o.poDate ? new Date(o.poDate).toLocaleDateString() : '—'}</Text></Table.Td>
                                                <Table.Td>
                                                    <Badge size="xs" color={STATUS_COLORS[o.status] || 'gray'} variant="light">
                                                        {o.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td><Text size="sm">{o.division?.name || '—'}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{o.supplier?.companyName || '—'}</Text></Table.Td>
                                                <Table.Td ta="center"><Badge variant="outline">{o.items?.length || 0}</Badge></Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        )}

                        {/* Dispatches preview */}
                        {tab === 'dispatches' && (
                            <Table.ScrollContainer minWidth={700}>
                                <Table verticalSpacing="xs" striped highlightOnHover fz="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Dispatch ID</Table.Th>
                                            <Table.Th>Reference</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Date</Table.Th>
                                            <Table.Th>Supplier</Table.Th>
                                            <Table.Th ta="center">Items</Table.Th>
                                            <Table.Th ta="center">Total Qty</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {dispatchResults.length === 0 && (
                                            <Table.Tr>
                                                <Table.Td colSpan={7} ta="center">
                                                    <Text c="dimmed" size="sm">No dispatches match the selected filters.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                        {dispatchResults.map((d: any) => {
                                            const totalQty = (d.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
                                            return (
                                                <Table.Tr key={d.id}>
                                                    <Table.Td><Text fw={600} c="blue">#{d.id}</Text></Table.Td>
                                                    <Table.Td><Text size="xs" c="dimmed">{d.referenceNumber || '—'}</Text></Table.Td>
                                                    <Table.Td>
                                                        <Badge size="xs" color={STATUS_COLORS[d.status] || 'gray'} variant="light">
                                                            {d.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td><Text size="xs">{new Date(d.createdAt).toLocaleDateString()}</Text></Table.Td>
                                                    <Table.Td><Text size="sm">{d.supplier?.companyName || '—'}</Text></Table.Td>
                                                    <Table.Td ta="center"><Badge variant="outline">{d.items?.length || 0}</Badge></Table.Td>
                                                    <Table.Td ta="center"><Text fw={700}>{totalQty}</Text></Table.Td>
                                                </Table.Tr>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        )}
                    </Paper>
                )}
            </Stack>
        </Box>
    );
}

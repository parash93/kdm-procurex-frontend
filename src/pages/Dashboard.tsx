import {
    SimpleGrid, Text, Title, Paper, Group, Stack, Box, ThemeIcon,
    Badge, Table, Alert, Card, LoadingOverlay, Pagination, Progress,
    Divider, RingProgress, Center,
} from "@mantine/core";
import {
    IconShoppingCart, IconClock, IconAlertTriangle, IconBuildingSkyscraper,
    IconPackage, IconCategory, IconCheck, IconTruck, IconBox,
    IconChartBar, IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Dashboard() {
    const { user, isAdmin, isSales } = useAuth();
    const divisionId = user?.divisionId ?? undefined;

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [delayedData, setDelayedData] = useState<{ data: any[]; total: number; totalPages: number }>({ data: [], total: 0, totalPages: 0 });
    const [delayedPage, setDelayedPage] = useState(1);
    const [ordersByDivision, setOrdersByDivision] = useState<any[]>([]);

    const DELAYED_LIMIT = 8;

    const fetchStats = async () => {
        const [statsData, divisionData] = await Promise.all([
            api.getDashboardStats(divisionId),
            api.getOrdersByDivision(divisionId),
        ]);
        setStats(statsData);
        setOrdersByDivision(divisionData);
    };

    const fetchDelayed = async (page: number) => {
        const data = await api.getDelayedOrders(divisionId, page, DELAYED_LIMIT);
        setDelayedData(data);
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchStats(), fetchDelayed(1)]);
        } catch (e) {
            console.error("Dashboard error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    useEffect(() => {
        if (!loading) fetchDelayed(delayedPage);
    }, [delayedPage]);

    // ── Stat cards ──────────────────────────────────────────────────────────
    const orderStatCards = stats ? [
        { label: 'Total Orders', value: stats.totalOrders, icon: IconShoppingCart, color: 'blue' },
        { label: 'Active Orders', value: stats.activeOrders, icon: IconBox, color: 'indigo' },
        { label: 'Pending Approval', value: stats.pendingApproval, icon: IconClock, color: 'orange' },
        { label: 'Delayed Orders', value: stats.delayedOrders, icon: IconAlertTriangle, color: 'red' },
        { label: 'Fully Delivered', value: stats.statusCounts?.FULLY_DELIVERED || 0, icon: IconCheck, color: 'teal' },
    ] : [];

    const dispatchStatCards = stats && !isSales ? [
        { label: 'Total Dispatches', value: stats.totalDispatches, icon: IconTruck, color: 'violet' },
        { label: 'In Transit', value: stats.activeDispatches, icon: IconTruck, color: 'cyan' },
        { label: 'Delivered', value: stats.deliveredDispatches, icon: IconCheck, color: 'green' },
        ...(!isAdmin && !divisionId ? [] : []),
    ] : [];

    const statusColors: Record<string, string> = {
        DRAFT: 'gray', PENDING_L1: 'yellow', APPROVED_L1: 'cyan',
        REJECTED_L1: 'red', ORDER_PLACED: 'blue',
        PARTIALLY_DELIVERED: 'orange', FULLY_DELIVERED: 'green',
        CLOSED: 'dark', CANCELLED: 'pink',
    };

    const dispatchColors: Record<string, string> = {
        DRAFT: 'gray', PACKED: 'violet', SHIPPED: 'indigo',
        IN_TRANSIT: 'cyan', DELIVERED: 'green', RETURNED: 'orange', CANCELLED: 'red',
    };

    // For ring progress: total vs active
    const deliveryRate = stats?.totalOrders > 0
        ? Math.round(((stats?.statusCounts?.FULLY_DELIVERED || 0) / stats.totalOrders) * 100)
        : 0;

    const divisionLabel = divisionId
        ? `Division: ${ordersByDivision[0]?.divisionName || '—'}`
        : 'All Divisions';

    return (
        <Box pb="xl" pos="relative">
            <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />
            <Stack gap="xl">
                {/* Header */}
                <Group justify="space-between" align="flex-end" wrap="wrap">
                    <Box>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px', fontSize: 'clamp(1.5rem, 5vw, 2.1rem)' }}>
                            {isSales ? 'Sales Dashboard' : 'Procurement Dashboard'}
                        </Title>
                        <Text c="dimmed" size="sm">
                            {divisionId ? `Showing data for your division · ` : 'All-division overview · '}
                            Real-time procurement tracking.
                        </Text>
                    </Box>
                    {divisionId && (
                        <Badge size="lg" color="blue" variant="light" leftSection={<IconBuildingSkyscraper size={14} />}>
                            {divisionLabel}
                        </Badge>
                    )}
                </Group>

                {/* Delayed alert */}
                {delayedData.total > 0 && (
                    <Alert variant="light" color="red" title={`${delayedData.total} Delayed Order${delayedData.total > 1 ? 's' : ''} Detected`} icon={<IconAlertTriangle size={16} />}>
                        Orders with items past their expected delivery date need immediate attention.
                    </Alert>
                )}

                {/* Order stat cards */}
                <Box>
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed" mb="sm">Order Overview</Text>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
                        {orderStatCards.map((stat) => (
                            <Paper key={stat.label} withBorder p="lg" radius="md" shadow="sm">
                                <Group justify="space-between" wrap="nowrap" gap="xs">
                                    <Box style={{ overflow: 'hidden' }}>
                                        <Text c="dimmed" fw={700} size="xs" tt="uppercase" mb={4} truncate="end">{stat.label}</Text>
                                        <Text fw={900} size="xl">{stat.value}</Text>
                                    </Box>
                                    <ThemeIcon variant="light" size="xl" radius="md" color={stat.color} visibleFrom="xs">
                                        <stat.icon size="1.2rem" />
                                    </ThemeIcon>
                                </Group>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </Box>

                {/* Dispatch stat cards (hidden for Sales) */}
                {!isSales && dispatchStatCards.length > 0 && (
                    <Box>
                        <Text fw={700} size="sm" tt="uppercase" c="dimmed" mb="sm">Dispatch Overview</Text>
                        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                            {dispatchStatCards.map((stat) => (
                                <Paper key={stat.label} withBorder p="lg" radius="md" shadow="sm">
                                    <Group justify="space-between" wrap="nowrap" gap="xs">
                                        <Box style={{ overflow: 'hidden' }}>
                                            <Text c="dimmed" fw={700} size="xs" tt="uppercase" mb={4} truncate="end">{stat.label}</Text>
                                            <Text fw={900} size="xl">{stat.value}</Text>
                                        </Box>
                                        <ThemeIcon variant="light" size="xl" radius="md" color={stat.color} visibleFrom="xs">
                                            <stat.icon size="1.2rem" />
                                        </ThemeIcon>
                                    </Group>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    </Box>
                )}

                {/* Charts row */}
                <SimpleGrid cols={{ base: 1, md: isSales ? 1 : 2 }} spacing="xl">
                    {/* Order Flow Summary */}
                    <Paper withBorder p="xl" radius="md" shadow="sm">
                        <Group justify="space-between" mb="lg">
                            <Title order={3}>Order Flow Summary</Title>
                            <RingProgress
                                size={60}
                                thickness={6}
                                sections={[{ value: deliveryRate, color: 'teal' }]}
                                label={<Center><Text size="xs" fw={700}>{deliveryRate}%</Text></Center>}
                            />
                        </Group>
                        <Stack gap="xs">
                            {stats?.statusCounts && Object.entries(stats.statusCounts).map(([status, count]) => (
                                <Box key={status}>
                                    <Group justify="space-between" mb={4}>
                                        <Group gap="sm">
                                            <Badge color={statusColors[status] || 'gray'} variant="filled" size="xs" />
                                            <Text fw={500} size="sm">{status.replace(/_/g, ' ')}</Text>
                                        </Group>
                                        <Text fw={700} size="sm">{count as number}</Text>
                                    </Group>
                                    <Progress
                                        value={stats.totalOrders > 0 ? ((count as number) / stats.totalOrders) * 100 : 0}
                                        color={statusColors[status] || 'gray'}
                                        size="xs"
                                        radius="xl"
                                    />
                                </Box>
                            ))}
                        </Stack>
                    </Paper>

                    {/* Dispatch Status (hidden for Sales) */}
                    {!isSales && (
                        <Paper withBorder p="xl" radius="md" shadow="sm">
                            <Title order={3} mb="lg">Dispatch Status Breakdown</Title>
                            <Stack gap="xs">
                                {stats?.dispatchStatusCounts && Object.entries(stats.dispatchStatusCounts).map(([status, count]) => (
                                    <Box key={status}>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap="sm">
                                                <Badge color={dispatchColors[status] || 'gray'} variant="filled" size="xs" />
                                                <Text fw={500} size="sm">{status.replace(/_/g, ' ')}</Text>
                                            </Group>
                                            <Text fw={700} size="sm">{count as number}</Text>
                                        </Group>
                                        <Progress
                                            value={stats.totalDispatches > 0 ? ((count as number) / stats.totalDispatches) * 100 : 0}
                                            color={dispatchColors[status] || 'gray'}
                                            size="xs"
                                            radius="xl"
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>
                    )}
                </SimpleGrid>

                {/* Division breakdown — enhanced with dispatched/delivered */}
                <Paper withBorder p="xl" radius="md" shadow="sm">
                    <Group mb="lg" gap="sm">
                        <IconChartBar size={20} />
                        <Title order={3}>
                            {divisionId ? 'Division Summary' : 'Orders by Division'}
                        </Title>
                    </Group>
                    <Table.ScrollContainer minWidth={600}>
                        <Table verticalSpacing="sm" striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Division</Table.Th>
                                    <Table.Th ta="center">Orders</Table.Th>
                                    <Table.Th ta="center">Total Qty</Table.Th>
                                    {!isSales && <>
                                        <Table.Th ta="center">Dispatched Qty</Table.Th>
                                        <Table.Th ta="center">Delivered Qty</Table.Th>
                                        <Table.Th ta="center">Pending Qty</Table.Th>
                                    </>}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {ordersByDivision.map((div: any) => {
                                    const pct = div.totalQty > 0 ? Math.round((div.deliveredQty / div.totalQty) * 100) : 0;
                                    return (
                                        <Table.Tr key={div.divisionName}>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <IconBuildingSkyscraper size={14} color="gray" />
                                                    <Text fw={600} size="sm">{div.divisionName}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Badge variant="light">{div.count}</Badge>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text fw={700} c="blue">{div.totalQty.toLocaleString()}</Text>
                                            </Table.Td>
                                            {!isSales && <>
                                                <Table.Td ta="center">
                                                    <Text fw={600} c="indigo">{div.dispatchedQty.toLocaleString()}</Text>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Group gap={4} justify="center">
                                                        <Text fw={600} c="teal">{div.deliveredQty.toLocaleString()}</Text>
                                                        <Badge size="xs" color="teal" variant="light">{pct}%</Badge>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Text fw={600} c={div.pendingQty > 0 ? 'orange' : 'teal'}>
                                                        {div.pendingQty.toLocaleString()}
                                                    </Text>
                                                </Table.Td>
                                            </>}
                                        </Table.Tr>
                                    );
                                })}
                                {ordersByDivision.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={6} ta="center">
                                            <Text c="dimmed" size="sm">No data available</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>

                {/* Resources (admin only) */}
                {isAdmin && (
                    <Paper withBorder p="xl" radius="md" shadow="sm">
                        <Title order={3} mb="lg">Resources Overview</Title>
                        <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing="md">
                            {[
                                { icon: IconBuildingSkyscraper, label: 'Divisions', value: stats?.totalDivisions || 0, color: 'indigo' },
                                { icon: IconCategory, label: 'Categories', value: stats?.totalCategories || 0, color: 'teal' },
                                { icon: IconPackage, label: 'Products', value: stats?.totalProducts || 0, color: 'cyan' },
                                { icon: IconUsers, label: 'Suppliers', value: stats?.totalSuppliers || 0, color: 'grape' },
                            ].map(r => (
                                <Paper key={r.label} withBorder p="md" radius="md">
                                    <Group gap="sm">
                                        <ThemeIcon size="lg" radius="md" variant="light" color={r.color}>
                                            <r.icon size={18} />
                                        </ThemeIcon>
                                        <div>
                                            <Text fw={900} size="lg">{r.value}</Text>
                                            <Text size="xs" c="dimmed">{r.label}</Text>
                                        </div>
                                    </Group>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    </Paper>
                )}

                {/* Delayed Orders Table with Pagination */}
                {delayedData.total > 0 && (
                    <Card withBorder radius="md" p="xl" shadow="sm">
                        <Group justify="space-between" mb="lg" wrap="wrap">
                            <Group gap="sm">
                                <IconAlertTriangle size={20} color="red" />
                                <Title order={3} c="red">Delayed Orders</Title>
                                <Badge color="red" size="lg">{delayedData.total}</Badge>
                            </Group>
                        </Group>
                        <Divider mb="md" />
                        <Table.ScrollContainer minWidth={500}>
                            <Table verticalSpacing="sm" striped>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>PO Number</Table.Th>
                                        <Table.Th>Division</Table.Th>
                                        <Table.Th>Supplier</Table.Th>
                                        <Table.Th>Next Scheduled Delivery</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th ta="center">Items</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {delayedData.data.map((o: any) => {
                                        const earliestDelay = o.items
                                            .filter((i: any) => i.expectedDeliveryDate)
                                            .sort((a: any, b: any) => new Date(a.expectedDeliveryDate).getTime() - new Date(b.expectedDeliveryDate).getTime())[0];
                                        const daysLate = earliestDelay
                                            ? Math.floor((Date.now() - new Date(earliestDelay.expectedDeliveryDate).getTime()) / 86400000)
                                            : 0;
                                        return (
                                            <Table.Tr key={o.id}>
                                                <Table.Td><Text fw={700} c="red">{o.poNumber}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{o.division?.name || '—'}</Text></Table.Td>
                                                <Table.Td><Text size="sm">{o.supplier?.companyName || '—'}</Text></Table.Td>
                                                <Table.Td>
                                                    <Stack gap={2}>
                                                        <Text size="xs">{earliestDelay ? new Date(earliestDelay.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</Text>
                                                        {daysLate > 0 && <Badge size="xs" color="red" variant="light">{daysLate}d overdue</Badge>}
                                                    </Stack>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge color={statusColors[o.status] || 'gray'} variant="light">{o.status.replace(/_/g, ' ')}</Badge>
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <Badge variant="outline">{o.items?.length || 0}</Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>

                        {delayedData.totalPages > 1 && (
                            <Group justify="center" mt="md">
                                <Pagination
                                    value={delayedPage}
                                    onChange={setDelayedPage}
                                    total={delayedData.totalPages}
                                    size="sm"
                                />
                            </Group>
                        )}
                    </Card>
                )}
            </Stack>
        </Box>
    );
}

import {
    SimpleGrid,
    Text,
    Title,
    Paper,
    Group,
    Stack,
    Box,
    ThemeIcon,
    Badge,
    Table,
    Alert,
    Card
} from "@mantine/core";
import {
    IconShoppingCart,
    IconClock,
    IconAlertTriangle,
    IconBuildingSkyscraper,
    IconPackage,
    IconCategory,
    IconCheck
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [delayedOrders, setDelayedOrders] = useState<any[]>([]);
    const [ordersByDivision, setOrdersByDivision] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            const [statsData, delayedData, divisionData] = await Promise.all([
                api.getDashboardStats(),
                api.getDelayedOrders(),
                api.getOrdersByDivision()
            ]);
            setStats(statsData);
            setDelayedOrders(delayedData);
            setOrdersByDivision(divisionData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const statCards = stats ? [
        { label: 'Active Orders', value: stats.activeOrders, icon: IconShoppingCart, color: 'blue' },
        { label: 'Pending L1', value: stats.statusCounts?.PENDING_L1 || 0, icon: IconClock, color: 'orange' },
        { label: 'Pending L2', value: stats.statusCounts?.APPROVED_L1 || 0, icon: IconClock, color: 'violet' },
        { label: 'Delayed Orders', value: stats.delayedOrders, icon: IconAlertTriangle, color: 'red' },
        { label: 'Delivered', value: stats.statusCounts?.DELIVERED || 0, icon: IconCheck, color: 'teal' },
    ] : [];

    const statusColors: Record<string, string> = {
        DRAFT: 'gray',
        PENDING_L1: 'yellow',
        APPROVED_L1: 'blue',
        REJECTED_L1: 'red',
        ORDER_PLACED: 'green',
        IN_PRODUCTION: 'orange',
        DELIVERED: 'teal'
    };

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Box>
                    <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Procurement Dashboard</Title>
                    <Text c="dimmed" size="sm">Real-time status tracking and inventory metrics.</Text>
                </Box>

                {delayedOrders.length > 0 && (
                    <Alert variant="light" color="red" title="Delayed Orders Detected" icon={<IconAlertTriangle size={16} />}>
                        There are {delayedOrders.length} orders with items past their expected delivery date.
                    </Alert>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="xl">
                    {statCards.map((stat) => (
                        <Paper key={stat.label} withBorder p="xl" radius="md" shadow="sm">
                            <Group justify="space-between">
                                <div>
                                    <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                                        {stat.label}
                                    </Text>
                                    <Text fw={900} size="xl">
                                        {stat.value}
                                    </Text>
                                </div>
                                <ThemeIcon variant="light" size="xl" radius="md" color={stat.color}>
                                    <stat.icon size="1.4rem" />
                                </ThemeIcon>
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                    <Paper withBorder p="xl" radius="md" shadow="sm">
                        <Title order={3} mb="lg">Order Flow Summary</Title>
                        <Stack gap="xs">
                            {stats?.statusCounts && Object.entries(stats.statusCounts).map(([status, count]) => (
                                <Group key={status} justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                                    <Group gap="sm">
                                        <Badge color={statusColors[status] || 'gray'} variant="filled" size="sm" />
                                        <Text fw={500} size="sm">{status.replace(/_/g, ' ')}</Text>
                                    </Group>
                                    <Text fw={700}>{count as number}</Text>
                                </Group>
                            ))}
                        </Stack>
                    </Paper>

                    <Paper withBorder p="xl" radius="md" shadow="sm">
                        <Title order={3} mb="lg">Orders by Division</Title>
                        <Table verticalSpacing="xs">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Division</Table.Th>
                                    <Table.Th ta="center">Count</Table.Th>
                                    <Table.Th ta="right">Total Value</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {ordersByDivision.map((div) => (
                                    <Table.Tr key={div.divisionName}>
                                        <Table.Td>{div.divisionName}</Table.Td>
                                        <Table.Td ta="center">
                                            <Badge variant="light" size="lg">{div.count}</Badge>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Group gap={4} justify="flex-end">
                                                <Text fw={900} size="lg" c="blue">INR {div.totalAmount.toLocaleString()}</Text>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Paper>
                </SimpleGrid>

                <Paper withBorder p="xl" radius="md" shadow="sm">
                    <Title order={3} mb="lg">Resources Overview</Title>
                    <SimpleGrid cols={3} spacing="md">
                        <Stack gap={5} ta="center">
                            <ThemeIcon size="lg" radius="md" variant="light" color="indigo" mx="auto">
                                <IconBuildingSkyscraper size={20} />
                            </ThemeIcon>
                            <Text fw={700} size="lg">{stats?.totalDivisions || 0}</Text>
                            <Text size="xs" c="dimmed">Divisions</Text>
                        </Stack>
                        <Stack gap={5} ta="center">
                            <ThemeIcon size="lg" radius="md" variant="light" color="teal" mx="auto">
                                <IconCategory size={20} />
                            </ThemeIcon>
                            <Text fw={700} size="lg">{stats?.totalCategories || 0}</Text>
                            <Text size="xs" c="dimmed">Categories</Text>
                        </Stack>
                        <Stack gap={5} ta="center">
                            <ThemeIcon size="lg" radius="md" variant="light" color="cyan" mx="auto">
                                <IconPackage size={20} />
                            </ThemeIcon>
                            <Text fw={700} size="lg">{stats?.totalProducts || 0}</Text>
                            <Text size="xs" c="dimmed">Products</Text>
                        </Stack>
                    </SimpleGrid>
                </Paper>

                {delayedOrders.length > 0 && (
                    <Card withBorder radius="md" p="xl" shadow="sm">
                        <Title order={3} mb="lg" c="red">Delayed Orders Details</Title>
                        <Table.ScrollContainer minWidth={500}>
                            <Table verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>PO Number</Table.Th>
                                        <Table.Th>Supplier</Table.Th>
                                        <Table.Th>Next Scheduled Delivery</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {delayedOrders.map((o) => {
                                        const earliestDelay = o.items
                                            .filter((i: any) => i.expectedDeliveryDate)
                                            .sort((a: any, b: any) => new Date(a.expectedDeliveryDate).getTime() - new Date(b.expectedDeliveryDate).getTime())[0];

                                        return (
                                            <Table.Tr key={o.id}>
                                                <Table.Td><Text fw={700} c="red">{o.poNumber}</Text></Table.Td>
                                                <Table.Td>{o.supplier?.companyName}</Table.Td>
                                                <Table.Td>
                                                    {earliestDelay ? new Date(earliestDelay.expectedDeliveryDate).toLocaleString() : 'N/A'}
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge color="red" variant="outline">{o.status}</Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Card>
                )}
            </Stack>
        </Box>
    );
}

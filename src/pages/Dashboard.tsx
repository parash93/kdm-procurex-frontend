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
    IconTruck,
    IconAlertTriangle,
    IconBuildingSkyscraper,
    IconPackage,
    IconCategory
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
        { label: 'Pending Approvals', value: stats.pendingApprovals, icon: IconClock, color: 'orange' },
        { label: 'Delayed Orders', value: stats.delayedOrders, icon: IconAlertTriangle, color: 'red' },
        { label: 'Total Suppliers', value: stats.totalSuppliers, icon: IconTruck, color: 'green' },
    ] : [];

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Box>
                    <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Dashboard</Title>
                    <Text c="dimmed" size="sm">Real-time procurement metrics and alerts.</Text>
                </Box>

                {delayedOrders.length > 0 && (
                    <Alert variant="light" color="red" title="Delayed Orders Detected" icon={<IconAlertTriangle size={16} />}>
                        There are {delayedOrders.length} orders that have passed their expected delivery date.
                    </Alert>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl">
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
                                                <Text fw={900} size="lg" c="blue">${div.totalAmount.toLocaleString()}</Text>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Paper>
                </SimpleGrid>

                {delayedOrders.length > 0 && (
                    <Card withBorder radius="md" p="xl" shadow="sm">
                        <Title order={3} mb="lg" c="red">Delayed Orders Details</Title>
                        <Table.ScrollContainer minWidth={500}>
                            <Table verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>PO Number</Table.Th>
                                        <Table.Th>Supplier</Table.Th>
                                        <Table.Th>Expected Delivery</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {delayedOrders.map((o) => (
                                        <Table.Tr key={o.id}>
                                            <Table.Td><Text fw={700} c="red">{o.poNumber}</Text></Table.Td>
                                            <Table.Td>{o.supplier?.companyName}</Table.Td>
                                            <Table.Td>{new Date(o.expectedDeliveryDate).toLocaleDateString()}</Table.Td>
                                            <Table.Td>
                                                <Badge color="red" variant="outline">{o.status}</Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Card>
                )}
            </Stack>
        </Box>
    );
}

import {
    Table,
    Button,
    Group,
    Title,
    Badge,
    Paper,
    Stack,
    Text,
    Box,
    ActionIcon,
    Modal,
    TextInput,
    NumberInput,
    ScrollArea,
} from "@mantine/core";
import {
    IconPlus,
    IconHistory,
    IconMinus,
    IconSearch,
    IconPackage,

    IconExclamationCircle,
    IconDownload,
} from "@tabler/icons-react";
import { downloadCSV } from "../utils/export";
import { useEffect, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { notifications } from "@mantine/notifications";

export function Inventory() {
    const { user, isAdmin } = useAuth();
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
    const [updateOpened, { open: openUpdate, close: closeUpdate }] = useDisclosure(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);

    const updateForm = useForm({
        initialValues: {
            quantity: 1,
            type: 'ADD' as 'ADD' | 'SUBTRACT',
            reason: ""
        },
        validate: {
            quantity: (val) => (val <= 0 ? "Must be greater than 0" : null),
            reason: (val) => (!val ? "Reason is required" : null)
        }
    });

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const data = await api.getInventory();
            setInventory(data || []);
        } catch (error) {
            console.error("Error fetching inventory:", error);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleViewHistory = async (item: any) => {
        setSelectedProduct(item.product);
        try {
            const data = await api.getInventoryHistory(item.productId);
            setHistory(data || []);
            openHistory();
        } catch (error) {
            console.error("Error fetching history:", error);
            setHistory([]);
        }
    };

    const handleOpenUpdate = (item: any, type: 'ADD' | 'SUBTRACT') => {
        if (!isAdmin) {
            notifications.show({ title: 'Access Denied', message: 'Only admins can manually adjust stock', color: 'red' });
            return;
        }
        setSelectedProduct(item.product);
        updateForm.setValues({
            quantity: 1,
            type,
            reason: ""
        });
        openUpdate();
    };

    const onSubmitUpdate = async (values: typeof updateForm.values) => {
        try {
            await api.updateInventory({
                productId: selectedProduct.id,
                ...values,
                updatedBy: user?.username || 'unknown'
            });
            notifications.show({
                title: "Stock Updated",
                message: `Successfully ${values.type === 'ADD' ? 'added' : 'removed'} ${values.quantity} units for ${selectedProduct.name}`,
                color: values.type === 'ADD' ? 'green' : 'orange'
            });
            closeUpdate();
            fetchInventory();
        } catch (error) {
            notifications.show({
                title: "Error",
                message: "Failed to update stock",
                color: "red"
            });
        }
    };



    const handleExport = () => {
        const dataToExport = inventory.map((i: any) => ({
            id: i.id,
            productName: i.product?.name,
            category: i.product?.category?.name,
            quantity: i.quantity,
            lastUpdated: new Date(i.updatedAt).toLocaleString(),
        }));
        downloadCSV(dataToExport, "inventory");
    };

    const filteredInventory = inventory.filter(item =>
        item.product?.name.toLowerCase().includes(search.toLowerCase())
    );

    const rows = filteredInventory.map((item) => (
        <Table.Tr key={item.id}>
            <Table.Td>
                <Text size="sm" c="dimmed">#{item.id}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="sm">
                    <Box style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: 'var(--mantine-color-blue-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <IconPackage size={20} color="var(--mantine-color-blue-filled)" />
                    </Box>
                    <Box>
                        <Text size="sm" fw={700}>{item.product?.name}</Text>
                        <Text size="xs" c="dimmed">{item.product?.category?.name}</Text>
                    </Box>
                </Group>
            </Table.Td>
            <Table.Td>
                <Text fw={900} size="lg" c={item.quantity < 5 ? 'red' : 'inherit'}>
                    {item.quantity}
                </Text>
                {item.quantity < 5 && (
                    <Badge color="red" variant="light" size="xs" leftSection={<IconExclamationCircle size={10} />}>
                        Low Stock
                    </Badge>
                )}
            </Table.Td>
            <Table.Td>
                <Text size="xs" c="dimmed">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" justify="flex-end">
                    {isAdmin && (
                        <>
                            <ActionIcon variant="light" color="green" onClick={() => handleOpenUpdate(item, 'ADD')} title="Add Stock">
                                <IconPlus size={18} />
                            </ActionIcon>
                            <ActionIcon variant="light" color="orange" onClick={() => handleOpenUpdate(item, 'SUBTRACT')} title="Subtract Stock">
                                <IconMinus size={18} />
                            </ActionIcon>
                        </>
                    )}
                    <ActionIcon variant="subtle" color="gray" onClick={() => handleViewHistory(item)} title="View History">
                        <IconHistory size={18} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Box>
                    <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Inventory Management</Title>
                    <Text c="dimmed" size="sm">Track stock levels and movement across your catalog.</Text>
                </Box>

                <Paper p="md" radius="md" withBorder shadow="sm">
                    <Group mb="lg">
                        <TextInput
                            placeholder="Search inventory by product name..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            style={{ flex: 1 }}
                            radius="md"
                        />

                        <Button
                            leftSection={<IconDownload size={18} />}
                            onClick={handleExport}
                            variant="outline"
                            color="gray"
                            style={{ marginLeft: 8 }}
                        >
                            Export CSV
                        </Button>
                    </Group>

                    <Table.ScrollContainer minWidth={600}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th w={60}>ID</Table.Th>
                                    <Table.Th>Product</Table.Th>
                                    <Table.Th>Available Stock</Table.Th>
                                    <Table.Th>Last Updated</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {loading ? (
                                    <Table.Tr><Table.Td colSpan={4} ta="center" py="xl">Loading inventory...</Table.Td></Table.Tr>
                                ) : rows.length > 0 ? rows : (
                                    <Table.Tr><Table.Td colSpan={4} ta="center" py="xl">No items found</Table.Td></Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>
            </Stack>

            {/* History Modal */}
            <Modal
                opened={historyOpened}
                onClose={closeHistory}
                title={<Title order={3}>Stock History: {selectedProduct?.name}</Title>}
                size="lg"
            >
                <ScrollArea h={400}>
                    <Table verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Qty</Table.Th>
                                <Table.Th>Reason</Table.Th>
                                <Table.Th>By</Table.Th>
                                <Table.Th>Time</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {history.map((h) => (
                                <Table.Tr key={h.id}>
                                    <Table.Td>
                                        <Badge color={h.type === 'ADD' ? 'green' : 'red'} variant="light">
                                            {h.type}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td fw={700}>{h.quantity}</Table.Td>
                                    <Table.Td>
                                        <Text size="xs">{h.reason}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs">{h.updatedBy}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{new Date(h.timestamp).toLocaleString()}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Modal>

            {/* Update Stock Modal */}
            <Modal
                opened={updateOpened}
                onClose={closeUpdate}
                title={<Title order={4}>{updateForm.values.type === 'ADD' ? 'Restock' : 'Subtract Stock'} - {selectedProduct?.name}</Title>}
                radius="md"
            >
                <form onSubmit={updateForm.onSubmit(onSubmitUpdate)}>
                    <Stack>
                        <NumberInput
                            label="Quantity"
                            min={1}
                            required
                            {...updateForm.getInputProps('quantity')}
                        />
                        <TextInput
                            label="Reason"
                            placeholder="e.g. Manually added, Damage, etc."
                            required
                            {...updateForm.getInputProps('reason')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" color="gray" onClick={closeUpdate}>Cancel</Button>
                            <Button
                                type="submit"
                                color={updateForm.values.type === 'ADD' ? 'green' : 'orange'}
                            >
                                Confirm Update
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

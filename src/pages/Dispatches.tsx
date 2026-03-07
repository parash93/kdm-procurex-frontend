import {
    Table, Button, Group, Title, Badge, ActionIcon, Modal,
    TextInput, Select, Paper, Stack, Text, Box, LoadingOverlay,
    Stepper, NumberInput, Menu
} from "@mantine/core";
import { IconPlus, IconTruck, IconCheck, IconX, IconEye, IconRotateClockwise, IconEdit, IconPackage, IconTrash } from '@tabler/icons-react';
import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePaginatedData } from "../hooks/usePaginatedData";
import { SearchBar, PaginationFooter } from "../components/PaginationControls";
import { notifications } from "@mantine/notifications";

export function Dispatches() {
    const { isAdmin } = useAuth();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [opened, { open, close }] = useDisclosure(false);

    // Data Loading
    const {
        data: dispatches, page, limit, totalPages, search,
        setSearch, setPage, setLimit, refetch, rangeText, loading
    } = usePaginatedData(
        (p, l, s) => api.getDispatches(p, l, s)
    );

    // Create Modal State
    const [activeStep, setActiveStep] = useState(0);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [poItems, setPoItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [viewDispatch, setViewDispatch] = useState<any | null>(null);
    const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);

    const [updateStatusData, setUpdateStatusData] = useState<{ id: number; status: string } | null>(null);
    const [statusNote, setStatusNote] = useState('');
    const [updateModalOpened, { open: openUpdateModal, close: closeUpdateModal }] = useDisclosure(false);

    // Form — no referenceNumber field anymore
    const form = useForm({
        initialValues: {
            supplierId: '', // string for Select
            remarks: '',
            items: [] as { poItemId: number; quantity: number; max: number; productName: string; poNumber: string }[]
        },
        validate: {
            supplierId: (val) => !val ? 'Select a supplier' : null,
            items: (val) => {
                if (val.length === 0) return 'Add at least one item';
                for (const item of val) {
                    if (item.quantity <= 0) return 'Quantity must be > 0';
                    if (item.quantity > item.max) return `Max quantity is ${item.max}`;
                }
                return null;
            }
        }
    });

    // Fetch Suppliers on open
    useEffect(() => {
        if (opened) {
            api.getSuppliers()
                .then(data => setSuppliers((data || []).filter((s: any) => s.status === 'ACTIVE')))
                .catch(console.error);
        }
    }, [opened]);

    // Fetch PO Items when Supplier changes — uses new backend endpoint that filters by product.supplierId
    const handleSupplierChange = async (supplierId: string | null) => {
        if (!supplierId) {
            form.setFieldValue('supplierId', '');
            setPoItems([]);
            return;
        }
        form.setFieldValue('supplierId', supplierId);
        form.setFieldValue('items', []);
        setPoItems([]);
        setLoadingItems(true);

        try {
            // Call the new backend endpoint that filters PO items by product's supplierId
            const items = await api.getOpenPoItemsBySupplier(Number(supplierId));
            setPoItems(items || []);
        } catch (err) {
            console.error(err);
            notifications.show({ title: 'Error', message: 'Failed to fetch PO items', color: 'red' });
        } finally {
            setLoadingItems(false);
        }
    };

    const addToDispatch = (item: any) => {
        const currentItems = form.values.items;
        if (currentItems.find(i => i.poItemId === item.poItemId)) return;

        form.insertListItem('items', {
            poItemId: item.poItemId,
            quantity: item.max, // Default to max
            max: item.max,
            productName: item.productName || item.product?.name,
            poNumber: item.poNumber
        });
    };

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true);
        try {
            await api.createDispatch({
                supplierId: Number(values.supplierId),
                remarks: values.remarks,
                items: values.items.map(i => ({ poItemId: i.poItemId, quantity: i.quantity }))
            });
            notifications.show({ title: 'Success', message: 'Dispatch created', color: 'green' });
            close();
            refetch();
            setActiveStep(0);
            form.reset();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to create dispatch',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDispatch = async (id: number) => {
        if (!isAdmin) return;
        if (window.confirm(`Delete dispatch #${id}? This action cannot be undone.`)) {
            try {
                await api.deleteDispatch(id);
                refetch();
                notifications.show({ title: 'Deleted', message: `Dispatch #${id} has been deleted.`, color: 'red' });
            } catch (error: any) {
                notifications.show({ title: 'Error', message: error.response?.data?.message || 'Delete failed', color: 'red' });
            }
        }
    };

    const nextStep = () => {
        if (activeStep === 0) {
            if (!form.values.supplierId) return form.validate();
            setActiveStep(1);
        } else if (activeStep === 1) {
            if (form.values.items.length === 0) {
                return form.setFieldError('items', 'Select at least one item');
            }
            setActiveStep(2);
        }
    };

    const prevStep = () => setActiveStep((current) => (current > 0 ? current - 1 : current));

    // Fetch full details when viewing
    const handleViewDispatch = async (dispatch: any) => {
        try {
            const data = await api.getDispatchById(dispatch.id);
            setViewDispatch(data);
            openViewModal();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to fetch details', color: 'red' });
        }
    };

    const openStatusUpdate = (id: number, status: string) => {
        setUpdateStatusData({ id, status });
        setStatusNote('');
        openUpdateModal();
    };

    const confirmStatusUpdate = async () => {
        if (!updateStatusData) return;
        setSubmitting(true);
        try {
            await api.updateDispatchStatus(updateStatusData.id, updateStatusData.status, statusNote);
            notifications.show({ title: 'Success', message: `Status updated to ${updateStatusData.status}`, color: 'green' });
            closeUpdateModal();
            refetch();
            // If viewing the same dispatch, refresh it
            if (viewDispatch && viewDispatch.id === updateStatusData.id) {
                handleViewDispatch(viewDispatch);
            }
        } catch (error: any) {
            notifications.show({ title: 'Error', message: error.response?.data?.message || 'Failed to update', color: 'red' });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            DELIVERED: 'green',
            SHIPPED: 'blue',
            IN_TRANSIT: 'cyan',
            PACKED: 'violet',
            RETURNED: 'orange',
            CANCELLED: 'red',
            DRAFT: 'gray'
        };
        return colors[status] || 'gray';
    };

    // Rendering Rows
    const rows = dispatches.map((element: any) => {
        const isCancelled = element.status === 'CANCELLED';
        const canPacked = element.status === 'DRAFT';
        const canShipped = element.status === 'PACKED';
        const canInTransit = element.status === 'SHIPPED';
        const canDelivered = element.status === 'IN_TRANSIT';
        const canReturned = element.status === 'DELIVERED';
        return (
            <Table.Tr key={element.id}>
                <Table.Td>
                    <Text size="sm" fw={600}>#{element.id}</Text>
                </Table.Td>
                <Table.Td>
                    <Text size="sm">{element.supplier?.companyName || '—'}</Text>
                </Table.Td>
                <Table.Td>
                    <Text size="sm" c="dimmed">{[...new Set(element.items?.map((i: any) => i.poItem?.purchaseOrder?.poNumber))].join(', ') || '—'}</Text>
                </Table.Td>
                <Table.Td>
                    <Text size="xs" c="dimmed">{new Date(element.createdAt).toLocaleDateString()}</Text>
                </Table.Td>
                <Table.Td>
                    <Badge color={getStatusColor(element.status)}>{element.status.replace(/_/g, ' ')}</Badge>
                </Table.Td>
                <Table.Td>
                    <Group gap={0}>
                        <Button size="xs" variant="light" leftSection={<IconEye size={12} />} mr="xs" onClick={() => handleViewDispatch(element)}>View</Button>
                        {!isCancelled && (
                            <Menu shadow="md" width={220}>
                                <Menu.Target>
                                    <ActionIcon variant="subtle"><IconEdit size={16} /></ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Update Status</Menu.Label>
                                    <Menu.Item
                                        leftSection={<IconPackage size={14} />}
                                        onClick={() => canPacked && openStatusUpdate(element.id, 'PACKED')}
                                        disabled={!canPacked}
                                        style={!canPacked ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                    >
                                        Packed {canPacked ? '←' : ''}
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconTruck size={14} />}
                                        onClick={() => canShipped && openStatusUpdate(element.id, 'SHIPPED')}
                                        disabled={!canShipped}
                                        style={!canShipped ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                    >
                                        Shipped {canShipped ? '←' : ''}
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconTruck size={14} />}
                                        onClick={() => canInTransit && openStatusUpdate(element.id, 'IN_TRANSIT')}
                                        disabled={!canInTransit}
                                        style={!canInTransit ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                    >
                                        In Transit {canInTransit ? '←' : ''}
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                        leftSection={<IconCheck size={14} />}
                                        color="green"
                                        onClick={() => canDelivered && openStatusUpdate(element.id, 'DELIVERED')}
                                        disabled={!canDelivered}
                                        style={!canDelivered ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                    >
                                        Delivered {canDelivered ? '←' : ''}
                                    </Menu.Item>
                                    <Menu.Item
                                        leftSection={<IconRotateClockwise size={14} />}
                                        color="orange"
                                        onClick={() => canReturned && openStatusUpdate(element.id, 'RETURNED')}
                                        disabled={!canReturned}
                                        style={!canReturned ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                    >
                                        Returned {canReturned ? '←' : ''}
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                        leftSection={<IconX size={14} />}
                                        color="red"
                                        onClick={() => openStatusUpdate(element.id, 'CANCELLED')}
                                    >
                                        Cancelled
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        )}
                        {isAdmin && (
                            <ActionIcon variant="subtle" color="red" ml={4} onClick={() => handleDeleteDispatch(element.id)}>
                                <IconTrash size={16} />
                            </ActionIcon>
                        )}
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                    <Box style={{ flex: 1, minWidth: 300 }}>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px', fontSize: 'clamp(1.5rem, 5vw, 2.1rem)' }}>Dispatches</Title>
                        <Text c="dimmed">Track incoming shipments and deliveries</Text>
                    </Box>
                    <Button leftSection={<IconPlus size={18} />} onClick={open} variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}>New Dispatch</Button>
                </Group>

                <Paper p="md" withBorder shadow="sm">
                    <LoadingOverlay visible={loading} />
                    <SearchBar search={search} onSearchChange={setSearch} limit={limit} onLimitChange={setLimit} />
                    <Table.ScrollContainer minWidth={800}>
                        <Table striped highlightOnHover verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>ID</Table.Th>
                                    <Table.Th>Supplier</Table.Th>
                                    <Table.Th>Related POs</Table.Th>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{rows}</Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                    <PaginationFooter totalPages={totalPages} page={page} onPageChange={setPage} rangeText={rangeText} />
                </Paper>
            </Stack>

            {/* Create Dispatch Modal */}
            <Modal
                opened={opened}
                onClose={() => { close(); setActiveStep(0); form.reset(); }}
                title={<Text fw={700} size="lg">Create New Dispatch</Text>}
                size="xl"
                radius="md"
                fullScreen={isMobile}
            >
                <Stepper active={activeStep} onStepClick={setActiveStep}>
                    {/* Step 1: Supplier Selection */}
                    <Stepper.Step label="Supplier" description="Choose supplier">
                        <Stack mt="md">
                            <Select
                                label="Supplier"
                                placeholder="Choose a supplier"
                                data={suppliers.map(s => ({ value: String(s.id), label: s.companyName }))}
                                withAsterisk
                                {...form.getInputProps('supplierId')}
                                onChange={handleSupplierChange}
                            />
                            <TextInput
                                label="Remarks"
                                placeholder="Optional remarks for this dispatch"
                                {...form.getInputProps('remarks')}
                            />
                        </Stack>
                    </Stepper.Step>

                    {/* Step 2: Item Selection — filtered by product's supplierId */}
                    <Stepper.Step label="Select Items" description="Add PO Items">
                        <Group align="flex-start" mt="md">
                            <Stack style={{ flex: 1 }}>
                                <Text fw={500}>
                                    Available Items
                                    <Text span size="xs" c="dimmed" ml={6}>
                                        (Products supplied by {suppliers.find(s => String(s.id) === form.values.supplierId)?.companyName})
                                    </Text>
                                </Text>
                                <Box style={{ maxHeight: 300, overflowY: 'auto' }}>
                                    {loadingItems && <Text c="dimmed" size="sm">Loading items...</Text>}
                                    {!loadingItems && poItems.length === 0 && (
                                        <Text c="dimmed" size="sm">No pending items found for this supplier.</Text>
                                    )}
                                    {poItems.map(item => (
                                        <Paper
                                            key={item.poItemId}
                                            withBorder
                                            p="xs"
                                            mb="xs"
                                            onClick={() => addToDispatch(item)}
                                            style={{
                                                cursor: 'pointer',
                                                borderColor: form.values.items.find(i => i.poItemId === item.poItemId) ? 'var(--mantine-color-blue-5)' : undefined,
                                                background: form.values.items.find(i => i.poItemId === item.poItemId) ? 'var(--mantine-color-blue-light)' : undefined,
                                            }}
                                        >
                                            <Group justify="space-between">
                                                <Box>
                                                    <Text size="sm" fw={500}>{item.productName || item.product?.name}</Text>
                                                    <Text size="xs" c="dimmed">{item.poNumber}</Text>
                                                </Box>
                                                <Badge>Remaining: {item.max}</Badge>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Box>
                            </Stack>

                            <Stack style={{ flex: 1 }}>
                                <Text fw={500}>Selected Items</Text>
                                {form.values.items.length === 0 && (
                                    <Text c="dimmed" size="sm">Click items on the left to add them.</Text>
                                )}
                                {form.values.items.map((item, index) => (
                                    <Paper key={index} withBorder p="xs">
                                        <Group justify="space-between">
                                            <Box>
                                                <Text size="sm">{item.productName}</Text>
                                                <Text size="xs" c="dimmed">{item.poNumber}</Text>
                                            </Box>
                                            <Group gap="xs">
                                                <NumberInput
                                                    w={80}
                                                    min={1}
                                                    max={item.max}
                                                    {...form.getInputProps(`items.${index}.quantity`)}
                                                />
                                                <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('items', index)}>
                                                    <IconX size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Group>
                                    </Paper>
                                ))}
                                {form.errors.items && <Text c="red" size="sm">{form.errors.items}</Text>}
                            </Stack>
                        </Group>
                    </Stepper.Step>

                    {/* Step 3: Review & Submit */}
                    <Stepper.Step label="Review" description="Confirm Dispatch">
                        <Stack mt="md">
                            <Paper withBorder p="md" radius="md">
                                <Text fw={700} mb="xs">Dispatch Summary</Text>
                                <Text size="sm"><strong>Supplier:</strong> {suppliers.find(s => String(s.id) === form.values.supplierId)?.companyName}</Text>
                                {form.values.remarks && <Text size="sm"><strong>Remarks:</strong> {form.values.remarks}</Text>}
                                <Text size="sm" mt="xs"><strong>Total Items:</strong> {form.values.items.length}</Text>
                            </Paper>
                            <Table withTableBorder>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Product</Table.Th>
                                        <Table.Th>PO #</Table.Th>
                                        <Table.Th>Quantity</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {form.values.items.map((i, idx) => (
                                        <Table.Tr key={idx}>
                                            <Table.Td>{i.productName}</Table.Td>
                                            <Table.Td>{i.poNumber}</Table.Td>
                                            <Table.Td>{i.quantity}</Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Stack>
                    </Stepper.Step>
                </Stepper>

                <Group justify="flex-end" mt="xl">
                    {activeStep !== 0 && <Button variant="default" onClick={prevStep}>Back</Button>}
                    {activeStep !== 2 ? (
                        <Button onClick={nextStep}>Next step</Button>
                    ) : (
                        <Button onClick={() => handleSubmit(form.values)} loading={submitting}>Submit Dispatch</Button>
                    )}
                </Group>
            </Modal>

            {/* View Dispatch Modal */}
            <Modal opened={viewModalOpened} onClose={closeViewModal} title={<Text fw={700}>Dispatch #{viewDispatch?.id}</Text>} size="lg" fullScreen={isMobile}>
                {viewDispatch && (
                    <Stack>
                        <Group justify="space-between">
                            <Box>
                                <Text size="sm" c="dimmed">Supplier</Text>
                                <Text fw={500}>{viewDispatch.supplier?.companyName || '—'}</Text>
                            </Box>
                            <Box>
                                <Text size="sm" c="dimmed">Date</Text>
                                <Text fw={500}>{new Date(viewDispatch.createdAt).toLocaleDateString()}</Text>
                            </Box>
                            <Badge size="lg" color={getStatusColor(viewDispatch.status)}>{viewDispatch.status}</Badge>
                        </Group>

                        {viewDispatch.remarks && (
                            <Text size="sm" c="dimmed"><strong>Remarks:</strong> {viewDispatch.remarks}</Text>
                        )}

                        <Text fw={500} mt="md">Items</Text>
                        <Table withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Product</Table.Th>
                                    <Table.Th>PO #</Table.Th>
                                    <Table.Th>Qty</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {viewDispatch.items?.map((item: any) => (
                                    <Table.Tr key={item.id}>
                                        <Table.Td>{item.poItem?.product?.name || 'Unknown'}</Table.Td>
                                        <Table.Td>{item.poItem?.purchaseOrder?.poNumber}</Table.Td>
                                        <Table.Td>{item.quantity}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>

                        <Text fw={500} mt="md">Timeline</Text>
                        <Stack gap="xs">
                            {viewDispatch.stageUpdates?.map((update: any) => (
                                <Paper key={update.id} withBorder p="sm">
                                    <Group justify="space-between">
                                        <Text size="sm" fw={500}>{update.stage}</Text>
                                        <Text size="xs" c="dimmed">{new Date(update.timestamp).toLocaleString()}</Text>
                                    </Group>
                                    {update.notes && <Text size="sm" mt={4}>{update.notes}</Text>}
                                    <Text size="xs" c="dimmed" mt={4}>By: {update.updatedByUser?.username || 'System'}</Text>
                                </Paper>
                            ))}
                            {(!viewDispatch.stageUpdates || viewDispatch.stageUpdates.length === 0) && <Text c="dimmed" size="sm">No updates recorded.</Text>}
                        </Stack>
                    </Stack>
                )}
            </Modal>

            {/* Status Update Modal */}
            <Modal opened={updateModalOpened} onClose={closeUpdateModal} title={`Update Status: ${updateStatusData?.status}`}>
                <Stack>
                    <Text size="sm">Add a note for this status update (optional):</Text>
                    <TextInput
                        placeholder="Enter remarks..."
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeUpdateModal}>Cancel</Button>
                        <Button onClick={confirmStatusUpdate} loading={submitting}>Confirm Update</Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

import {
    Table, Button, Group, Title, Badge, ActionIcon, Modal,
    TextInput, Select, Paper, Stack, Text, Box, LoadingOverlay,
    Stepper, NumberInput, Menu
} from "@mantine/core";
import { IconPlus, IconTruck, IconCheck, IconX, IconEye, IconRotateClockwise, IconEdit, IconPackage } from '@tabler/icons-react';
import { useState, useEffect } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../api/client";
import { usePaginatedData } from "../hooks/usePaginatedData";
import { SearchBar, PaginationFooter } from "../components/PaginationControls";
import { notifications } from "@mantine/notifications";

export function Dispatches() {
    // const isMobile = useMediaQuery('(max-width: 768px)');
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
    const [submitting, setSubmitting] = useState(false);
    const [viewDispatch, setViewDispatch] = useState<any | null>(null);
    const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);

    const [updateStatusData, setUpdateStatusData] = useState<{ id: number; status: string } | null>(null);
    const [statusNote, setStatusNote] = useState('');
    const [updateModalOpened, { open: openUpdateModal, close: closeUpdateModal }] = useDisclosure(false);

    const form = useForm({
        initialValues: {
            supplierId: '', // string for Select
            referenceNumber: '',
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
            api.getSuppliers().then(setSuppliers).catch(console.error);
        }
    }, [opened]);

    // Fetch PO Items when Supplier changes
    const handleSupplierChange = async (supplierId: string | null) => {
        if (!supplierId) {
            form.setFieldValue('supplierId', '');
            setPoItems([]);
            return;
        }
        form.setFieldValue('supplierId', supplierId);
        form.setFieldValue('items', []);
        setPoItems([]);

        try {
            // We need an endpoint to get Open PO Items for a supplier
            // Existing `getOrders` is too broad.
            // I'll filter client-side for now or use `getOrders({ status: 'ORDER_PLACED' })` filtering by supplier?
            // `api.getOrdersPaginated` supports status.
            // But we need ITEMS, not just orders.
            // And we need validation against "Remaining Qty".
            // Since backend "CreateDispatch" validates, frontend can filter best effort.

            // Just fetch all orders for supplier that are NOT Closed/Delivered
            // This might be heavy. Ideally backend provides `getOpenPoItems(supplierId)`.
            // I'll add `getOpenPoItems` to API later if needed. For now:
            const allOrders = await api.getOrders(); // Limitation: gets all orders?
            // Filter locally
            const openOrders = allOrders.filter((o: any) =>
                Number(o.supplierId) === Number(supplierId) &&
                ['ORDER_PLACED', 'PARTIALLY_DELIVERED', 'IN_PRODUCTION', 'READY_TO_SHIP'].includes(o.status)
            );

            // Extract items
            const items: any[] = [];
            openOrders.forEach((o: any) => {
                o.items.forEach((i: any) => {
                    // remaining = quantity - dispatchedQuantity
                    const remaining = i.quantity - (i.dispatchedQuantity || 0);
                    if (remaining > 0) {
                        items.push({
                            ...i,
                            poNumber: o.poNumber,
                            max: remaining,
                            poItemId: i.id
                        });
                    }
                });
            });
            setPoItems(items);
        } catch (err) {
            console.error(err);
            notifications.show({ title: 'Error', message: 'Failed to fetch PO items', color: 'red' });
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
                referenceNumber: values.referenceNumber,
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

    // Rendering Rows
    const rows = dispatches.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>#{element.id}</Table.Td>
            <Table.Td>{element.supplier?.companyName}</Table.Td>
            <Table.Td>{[...new Set(element.items?.map((i: any) => i.poItem?.purchaseOrder?.poNumber))].join(', ')}</Table.Td>
            <Table.Td>{element.referenceNumber || '-'}</Table.Td>
            <Table.Td>{new Date(element.dispatchDate).toLocaleDateString()}</Table.Td>
            <Table.Td>
                <Badge color={
                    element.status === 'DELIVERED' ? 'green' :
                        element.status === 'SHIPPED' ? 'blue' :
                            element.status === 'IN_TRANSIT' ? 'cyan' :
                                element.status === 'RETURNED' ? 'orange' :
                                    element.status === 'CANCELLED' ? 'red' :
                                        'gray'
                }>{element.status}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={0}>
                    <Button size="xs" variant="light" leftSection={<IconEye size={12} />} mr="xs" onClick={() => handleViewDispatch(element)}>View</Button>
                    {element.status !== 'CANCELLED' && (
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <ActionIcon variant="subtle"><IconEdit size={16} /></ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Update Status</Menu.Label>
                                <Menu.Item leftSection={<IconPackage size={14} />} onClick={() => openStatusUpdate(element.id, 'PACKED')}>Packed</Menu.Item>
                                <Menu.Item leftSection={<IconTruck size={14} />} onClick={() => openStatusUpdate(element.id, 'SHIPPED')}>Shipped</Menu.Item>
                                <Menu.Item leftSection={<IconTruck size={14} />} onClick={() => openStatusUpdate(element.id, 'IN_TRANSIT')}>In Transit</Menu.Item>
                                <Menu.Divider />
                                <Menu.Item leftSection={<IconCheck size={14} />} color="green" onClick={() => openStatusUpdate(element.id, 'DELIVERED')}>Delivered</Menu.Item>
                                <Menu.Item leftSection={<IconRotateClockwise size={14} />} color="orange" onClick={() => openStatusUpdate(element.id, 'RETURNED')}>Returned</Menu.Item>
                                <Menu.Item leftSection={<IconX size={14} />} color="red" onClick={() => openStatusUpdate(element.id, 'CANCELLED')}>Cancelled</Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end">
                    <Box>
                        <Title order={1}>Dispatches</Title>
                        <Text c="dimmed">Track incoming shipments and deliveries</Text>
                    </Box>
                    <Button leftSection={<IconPlus size={18} />} onClick={open}>New Dispatch</Button>
                </Group>

                <Paper p="md" withBorder>
                    <LoadingOverlay visible={loading} />
                    <SearchBar search={search} onSearchChange={setSearch} limit={limit} onLimitChange={setLimit} />
                    <Table.ScrollContainer minWidth={800}>
                        <Table striped highlightOnHover verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>ID</Table.Th>
                                    <Table.Th>Supplier</Table.Th>
                                    <Table.Th>Related POs</Table.Th>
                                    <Table.Th>Reference #</Table.Th>
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

            {/* Create Modal */}
            <Modal opened={opened} onClose={close} title="Create Dispatch" size="xl">
                <Stepper active={activeStep} onStepClick={setActiveStep}>
                    <Stepper.Step label="Supplier" description="Select Supplier">
                        <Stack mt="md">
                            <Select
                                label="Supplier"
                                placeholder="Choose supplier"
                                data={suppliers.map(s => ({ value: String(s.id), label: s.companyName }))}
                                {...form.getInputProps('supplierId')}
                                onChange={handleSupplierChange}
                            />
                            <TextInput
                                label="Reference Number"
                                placeholder="Invoice or DC Number"
                                {...form.getInputProps('referenceNumber')}
                            />
                            <TextInput
                                label="Remarks"
                                placeholder="Optional remarks"
                                {...form.getInputProps('remarks')}
                            />
                        </Stack>
                    </Stepper.Step>

                    <Stepper.Step label="Select Items" description="Add PO Items">
                        <Group align="flex-start" mt="md">
                            <Stack style={{ flex: 1 }}>
                                <Text fw={500}>Available Items</Text>
                                <Box style={{ maxHeight: 300, overflowY: 'auto' }}>
                                    {poItems.length === 0 && <Text c="dimmed">No pending items found.</Text>}
                                    {poItems.map(item => (
                                        <Paper key={item.poItemId} withBorder p="xs" mb="xs" onClick={() => addToDispatch(item)} style={{ cursor: 'pointer', borderColor: form.values.items.find(i => i.poItemId === item.poItemId) ? 'blue' : undefined }}>
                                            <Group justify="space-between">
                                                <Box>
                                                    <Text size="sm" fw={500}>{item.productName}</Text>
                                                    <Text size="xs" c="dimmed">{item.poNumber}</Text>
                                                </Box>
                                                <Badge>{item.max}</Badge>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Box>
                            </Stack>

                            <Stack style={{ flex: 1 }}>
                                <Text fw={500}>Selected Items</Text>
                                {form.values.items.map((item, index) => (
                                    <Paper key={index} withBorder p="xs">
                                        <Group justify="space-between">
                                            <Box>
                                                <Text size="sm">{item.productName}</Text>
                                                <Text size="xs">{item.poNumber}</Text>
                                            </Box>
                                            <Group gap="xs">
                                                <NumberInput
                                                    w={80}
                                                    min={1}
                                                    max={item.max}
                                                    {...form.getInputProps(`items.${index}.quantity`)}
                                                />
                                                <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('items', index)}>
                                                    <IconPlus style={{ transform: 'rotate(45deg)' }} />
                                                </ActionIcon>
                                            </Group>
                                        </Group>
                                    </Paper>
                                ))}
                                {form.errors.items && <Text c="red" size="sm">{form.errors.items}</Text>}
                            </Stack>
                        </Group>
                    </Stepper.Step>

                    <Stepper.Step label="Review" description="Confirm Dispatch">
                        <Stack mt="md">
                            <Text><strong>Supplier:</strong> {suppliers.find(s => String(s.id) === form.values.supplierId)?.companyName}</Text>
                            <Text><strong>Reference:</strong> {form.values.referenceNumber}</Text>
                            <Text><strong>Remarks:</strong> {form.values.remarks}</Text>
                            <Text><strong>Items:</strong> {form.values.items.length}</Text>
                            <Table>
                                <Table.Thead><Table.Tr><Table.Th>Item</Table.Th><Table.Th>Qty</Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                    {form.values.items.map((i, idx) => (
                                        <Table.Tr key={idx}>
                                            <Table.Td>{i.productName} ({i.poNumber})</Table.Td>
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
            <Modal opened={viewModalOpened} onClose={closeViewModal} title={`Dispatch #${viewDispatch?.id}`} size="lg">
                {viewDispatch && (
                    <Stack>
                        <Group justify="space-between">
                            <Box>
                                <Text size="sm" c="dimmed">Reference</Text>
                                <Text fw={500}>{viewDispatch.referenceNumber || '-'}</Text>
                            </Box>
                            <Box>
                                <Text size="sm" c="dimmed">Date</Text>
                                <Text fw={500}>{new Date(viewDispatch.dispatchDate).toLocaleDateString()}</Text>
                            </Box>
                            <Badge size="lg" color={
                                viewDispatch.status === 'DELIVERED' ? 'green' :
                                    viewDispatch.status === 'SHIPPED' ? 'blue' :
                                        viewDispatch.status === 'CANCELLED' ? 'red' : 'gray'
                            }>{viewDispatch.status}</Badge>
                        </Group>

                        <Text fw={500} mt="md">Items</Text>
                        <Table withTableBorder>
                            <Table.Thead><Table.Tr><Table.Th>Product</Table.Th><Table.Th>PO #</Table.Th><Table.Th>Qty</Table.Th></Table.Tr></Table.Thead>
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
                                <Paper key={update.id} withBorder p="sm" >
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

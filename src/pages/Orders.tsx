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
    Select,
    NumberInput,
    Divider,
    Grid,
    ScrollArea,
    Card,
    Timeline,
    Pagination,
    LoadingOverlay
} from "@mantine/core";
import {
    IconPlus,
    IconExternalLink,
    IconTrash,
    IconSearch,
    IconUser,
    IconBuildingSkyscraper,
    IconShip,
    IconEdit,
    IconFilter,
    IconClock,
    IconShoppingCart,
    IconPackage,
    IconDownload,
} from "@tabler/icons-react";
import { downloadCSV } from "../utils/export";
import { useEffect, useState, useCallback, useRef } from "react";
import { useMediaQuery, useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { notifications } from "@mantine/notifications";

const PAGE_SIZE_OPTIONS = [
    { value: '10', label: '10 per page' },
    { value: '20', label: '20 per page' },
    { value: '50', label: '50 per page' },
];

export function Orders() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { user, isAdmin, isOperations } = useAuth();
    const canSeeSupplier = isAdmin || isOperations; // Sales users cannot see supplier info
    const [divisions, setDivisions] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [trackingHistory, setTrackingHistory] = useState<any[]>([]);
    const [relatedDispatches, setRelatedDispatches] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [opened, { open, close }] = useDisclosure(false);
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
    const [approvalModalOpened, { open: openApproval, close: closeApproval }] = useDisclosure(false);

    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // Pagination & search state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [orders, setOrders] = useState<any[]>([]);
    const [search, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 400);
    }, []);

    const handlePageSizeChange = (value: string | null) => {
        if (value) {
            setLimit(Number(value));
            setPage(1);
        }
    };

    const handleStatusFilterChange = (value: string | null) => {
        setFilterStatus(value || 'ALL');
        setPage(1);
    };

    const approvals = {
        L1: ['ADMIN', 'OPERATIONS'],
        L2: ['ADMIN']
    }

    // PO Creation Form
    const poForm = useForm({
        initialValues: {
            divisionId: "",
            remarks: "",
            poDate: new Date().toISOString().split('T')[0],
            items: [
                { productId: "", productName: "", sku: "", quantity: 1, unitPrice: 0, totalPrice: 0, remarks: "", expectedDeliveryDate: "" }
            ]
        },
        validate: {
            items: {
                quantity: (value: number) => (value <= 0 ? 'Quantity must be > 0' : null),
            }
        }
    });

    // Approval Decision Form
    const approvalForm = useForm({
        initialValues: {
            approverId: "",
            level: 1,
            decision: "APPROVED" as "APPROVED" | "REJECTED",
            remarks: ""
        }
    });



    const [fetchVersion, setFetchVersion] = useState(0);
    const refetchOrders = useCallback(() => setFetchVersion(v => v + 1), []);

    useEffect(() => {
        const controller = new AbortController();

        const doFetch = async () => {
            setLoading(true);
            try {
                const result = await api.getOrdersPaginated(
                    page, limit,
                    debouncedSearch || undefined,
                    filterStatus !== 'ALL' ? filterStatus : undefined,
                    controller.signal
                );
                setOrders(result.data || []);
                setTotal(result.total || 0);
                setTotalPages(result.totalPages || 1);
            } catch (error: any) {
                if (error?.name === 'CanceledError' || error?.name === 'AbortError' || controller.signal.aborted) return;
                console.error("Error fetching orders:", error);
                setOrders([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        doFetch();
        return () => { controller.abort(); };
    }, [page, limit, debouncedSearch, filterStatus, fetchVersion]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchDropdownData = async () => {
            try {
                const [divisionsData, productsData] = await Promise.all([
                    api.getDivisions(),
                    api.getProducts()
                ]);
                if (!controller.signal.aborted) {
                    setDivisions((divisionsData || []).filter((d: any) => d.status === 'ACTIVE'));
                    setProducts((productsData || []).filter((p: any) => p.status === 'ACTIVE'));
                }

                if (isAdmin) {
                    const usersData = await api.getAuthUsers();
                    if (!controller.signal.aborted) setUsers(usersData || []);
                }
            } catch (error: any) {
                if (error?.name === 'CanceledError' || error?.name === 'AbortError' || controller.signal.aborted) return;
                console.error("Error fetching dropdown data:", error);
            }
        };

        fetchDropdownData();
        return () => { controller.abort(); };
    }, []);

    const handleAddItem = () => {
        poForm.insertListItem('items', {
            productId: "",
            productName: "",
            sku: "",
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            remarks: "",
            expectedDeliveryDate: ""
        });
    };

    const handleProductSelect = (index: number, productId: string) => {
        poForm.setFieldValue(`items.${index}.productId`, productId);
        const product = products.find(p => p.id == productId);
        if (product) {
            poForm.setFieldValue(`items.${index}.productName`, product.name);
            poForm.setFieldValue(`items.${index}.sku`, product.sku || "");

            // Calculate expected delivery date: today + minDeliveryDays
            const minDays = product.minDeliveryDays || 0;

            const date = poForm.values.poDate ? new Date(poForm.values.poDate) : new Date();
            date.setDate(date.getDate() + minDays);
            poForm.setFieldValue(`items.${index}.expectedDeliveryDate`, date.toISOString().split('T')[0]);
        }
    };

    const calculateItemTotal = (index: number, quantity?: number, unitPrice?: number) => {
        const item = poForm.values.items[index];
        const q = quantity !== undefined ? quantity : (item.quantity || 0);
        const u = unitPrice !== undefined ? unitPrice : (item.unitPrice || 0);
        const total = q * u;
        poForm.setFieldValue(`items.${index}.totalPrice`, total);
    };

    //const grandTotal = poForm.values.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    const handleViewDetails = async (order: any) => {
        setSelectedOrder(order);
        try {
            // Tracking history is now Dispatch based. 
            // Fetch dispatches specifically for this PO number
            const dispatchResult = await api.getDispatches(1, 50, order.poNumber);
            setRelatedDispatches(dispatchResult.data || []);

            // Map inventory quantity to items
            const enrichedItems = order.items.map((item: any) => {
                return { ...item, availableStock: 0 };
            });

            setSelectedOrder({ ...order, items: enrichedItems });
            setTrackingHistory([]);
        } catch (err) {
            console.error("Error fetching details:", err);
            setRelatedDispatches([]);
            setTrackingHistory([]);
        }
        openDetails();
    };



    const handleOpenApprovalModal = (decision: "APPROVED" | "REJECTED", level: number) => {
        if (level == 1) {
            if (!approvals.L1.includes(user?.role as string)) {
                notifications.show({ title: "Access Denied", message: "This user cannot perform approvals", color: "red" });
                return;
            }
        }

        if (level == 2) {
            if (!approvals.L2.includes(user?.role as string)) {
                notifications.show({ title: "Access Denied", message: "This user cannot perform approvals", color: "red" });
                return;
            }
        }

        // Strict check for stock before L2 approval
        if (level === 2 && decision === 'APPROVED') {

            // const insufficient = selectedOrder.items.some((item: any) => item.availableStock < item.quantity);
            // if (insufficient) {
            //     notifications.show({
            //         title: "Insufficient Stock",
            //         message: "Cannot approve Level 2: One or more items exceed available inventory.",
            //         color: "red"
            //     });
            //     return;
            // }
        }

        approvalForm.setValues({
            decision,
            level,
            approverId: user?.id || users[0]?.id || "",
            remarks: ""
        });
        openApproval();
    };

    const onSubmitApproval = async (values: typeof approvalForm.values) => {
        setSubmitting(true);
        try {
            await api.submitApproval({
                poId: selectedOrder.id,
                ...values
            });

            closeApproval();   // close approval sub-modal
            closeDetails();    // close PO details modal — prevents accidental re-click
            refetchOrders();   // refresh the list so new status is visible
            notifications.show({
                title: `Level ${values.level} ${values.decision === 'APPROVED' ? 'Approved ✓' : 'Rejected'}`,
                message: `PO ${selectedOrder.poNumber} has been ${values.decision.toLowerCase()} at Level ${values.level}.`,
                color: values.decision === 'APPROVED' ? 'green' : 'orange'
            });
        } catch (error) {
            notifications.show({ title: "Error", message: error instanceof Error ? error.message : "Approval failed", color: "red" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpen = () => {
        setIsEditing(false);
        poForm.reset();
        // Pre-fill division from logged-in user
        if (user?.divisionId) {
            poForm.setFieldValue('divisionId', user.divisionId.toString());
        }
        open();
    };

    const handleEdit = (order: any) => {
        setIsEditing(true);
        setSelectedOrder(order);
        poForm.setValues({
            divisionId: order.divisionId?.toString() || "",
            remarks: order.remarks || "",
            items: order.items.map((item: any) => ({
                productId: item.productId?.toString() || "",
                productName: item.productName || "",
                sku: item.sku || "",
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                remarks: item.remarks || "",
                expectedDeliveryDate: item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toISOString().split('T')[0] : ""
            }))
        });
        open();
    };

    const onSubmit = async (values: typeof poForm.values) => {
        setSubmitting(true);
        try {
            if (isEditing && selectedOrder) {
                await api.updateOrder(selectedOrder.id, values);
            } else {
                await api.createOrder(values);
            }
            close();
            refetchOrders();
            notifications.show({ title: "Success", message: `Order ${isEditing ? 'updated' : 'created'} successfully`, color: "green" });
        } catch (error) {
            console.error("Error saving order:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitL1 = async () => {
        setSubmitting(true);
        try {
            await api.updateOrder(selectedOrder.id, { status: 'PENDING_L1' });
            refetchOrders();
            closeDetails();
        } catch (error) {
            console.error("Error submitting L1:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const statusColors: Record<string, string> = {
        DRAFT: 'gray',
        PENDING_L1: 'yellow',
        APPROVED_L1: 'cyan',
        REJECTED_L1: 'red',
        ORDER_PLACED: 'blue',
        PARTIALLY_DELIVERED: 'orange',
        FULLY_DELIVERED: 'green',
        CLOSED: 'dark',
        CANCELLED: 'pink',
        DELETED: 'gray',
    };

    const from = orders.length > 0 ? (page - 1) * limit + 1 : 0;
    const to = Math.min(page * limit, total);
    const rangeText = `Showing ${from}–${to} of ${total} orders`;

    const handleExport = () => {
        // Flatten order data for CSV
        const dataToExport = orders.map((o: any) => ({
            id: o.id,
            poNumber: o.poNumber,
            supplier: o.supplier?.companyName,
            division: o.division?.name,
            totalItems: o.items?.length || 0,
            status: o.status,
            orderDate: new Date(o.poDate).toLocaleDateString(),
            remarks: o.remarks,
        }));
        downloadCSV(dataToExport, "purchase-orders");
    };

    const handleDeleteOrder = async (id: number, poNumber: string) => {
        if (!isAdmin) return;
        if (window.confirm(`Delete PO ${poNumber}? This will set it to DELETED status.`)) {
            try {
                await api.deleteOrder(id);
                refetchOrders();
                notifications.show({ title: 'Deleted', message: `${poNumber} has been deleted.`, color: 'red' });
            } catch (error: any) {
                notifications.show({ title: 'Error', message: error.response?.data?.message || 'Delete failed', color: 'red' });
            }
        }
    };

    const rows = orders.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text size="sm" c="dimmed">#{element.id}</Text>
            </Table.Td>
            <Table.Td>
                <Text fw={700} c="blue">{element.poNumber}</Text>
                <Text size="xs" c="dimmed">{new Date(element.poDate).toLocaleString()}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconBuildingSkyscraper size={14} />
                    <Text size="sm">{element.division?.name || '-'}</Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge variant="light" color={statusColors[element.status] || 'blue'}>
                    {element.status.replace(/_/g, ' ')}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group justify="flex-end" gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => handleViewDetails(element)}>
                        <IconExternalLink size={18} />
                    </ActionIcon>
                    {isAdmin && (
                        <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteOrder(element.id, element.poNumber)}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end">
                    <Box style={{ flex: 1 }}>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Purchase Orders</Title>
                        <Text c="dimmed" size="sm">Manage and track your procurement orders.</Text>
                    </Box>
                    <Button variant="gradient" gradient={{ from: 'blue', to: 'indigo' }} leftSection={<IconPlus size={18} />} onClick={handleOpen}>
                        New PO
                    </Button>
                    <Button
                        variant="outline"
                        color="gray"
                        leftSection={<IconDownload size={18} />}
                        onClick={handleExport}
                        style={{ marginLeft: 8 }}
                    >
                        Export CSV
                    </Button>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)', position: 'relative' }}>
                    <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />
                    <Group mb="lg" justify="space-between" wrap="wrap">
                        <TextInput
                            placeholder="Search PO # or Supplier..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => handleSearchChange(e.currentTarget.value)}
                            style={{ flex: 1, minWidth: 200 }}
                            radius="md"
                        />
                        <Group>
                            <Select
                                placeholder="Filter Status"
                                data={['ALL', ...Object.keys(statusColors)]}
                                value={filterStatus}
                                onChange={handleStatusFilterChange}
                                style={{ width: 180 }}
                                leftSection={<IconFilter size={16} />}
                                radius="md"
                                allowDeselect={false}
                            />
                            <Select
                                data={PAGE_SIZE_OPTIONS}
                                value={String(limit)}
                                onChange={handlePageSizeChange}
                                w={150}
                                radius="md"
                                allowDeselect={false}
                            />
                        </Group>
                    </Group>

                    <Table.ScrollContainer minWidth={900}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th w={60}>ID</Table.Th>
                                    <Table.Th>PO Details</Table.Th>
                                    <Table.Th>Division</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={6}>
                                            <Text ta="center" py="xl" c="dimmed">No orders found</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    <Group justify="space-between" align="center" mt="lg" wrap="wrap">
                        <Text size="sm" c="dimmed">{rangeText}</Text>
                        {totalPages > 1 && (
                            <Pagination
                                total={totalPages}
                                value={page}
                                onChange={setPage}
                                radius="md"
                                withEdges
                            />
                        )}
                    </Group>
                </Paper>
            </Stack>

            {/* Create PO Modal */}
            <Modal
                opened={opened}
                onClose={close}
                title={<Title order={3} fw={900}>{isEditing ? "Edit Purchase Order" : "Create Purchase Order"}</Title>}
                size="80%"
                fullScreen={isMobile}
                radius="md"
                padding="xl"
            >
                <form onSubmit={poForm.onSubmit(onSubmit)}>
                    <Stack gap="xl">
                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                {/* Division: prefilled if user has division, otherwise selectable */}
                                {user?.divisionId ? (
                                    <TextInput
                                        label="Division"
                                        value={divisions.find(d => d.id === user.divisionId)?.name || `Division #${user.divisionId}`}
                                        readOnly
                                        disabled
                                        leftSection={<IconBuildingSkyscraper size={16} />}
                                        description=""
                                    />
                                ) : (
                                    <Select
                                        label="Division"
                                        placeholder="Select division"
                                        data={divisions.map(d => ({ value: d.id + "", label: d.name }))}
                                        radius="md"
                                        leftSection={<IconBuildingSkyscraper size={16} />}
                                        {...poForm.getInputProps('divisionId')}
                                    />
                                )}
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="Remarks"
                                    placeholder="General remarks for this PO"
                                    radius="md"
                                    {...poForm.getInputProps('remarks')}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <TextInput
                                    label="PO Date"
                                    type="date"
                                    {...poForm.getInputProps(`poDate`)}
                                />
                            </Grid.Col>
                        </Grid>

                        <Divider label="Order Items" labelPosition="center" />

                        <ScrollArea.Autosize mah={500} type="always">
                            <Stack gap="sm">
                                {poForm.values.items.map((_, index) => {
                                    const selectedProdId = poForm.values.items[index].productId;
                                    const selectedProd = products.find(p => p.id == selectedProdId);

                                    // Calculate prefilled date (Today + minDeliveryDays)
                                    const minDays = selectedProd?.minDeliveryDays || 0;
                                    const minDate = poForm.values.poDate ? new Date(poForm.values.poDate) : new Date();
                                    minDate.setDate(minDate.getDate() + minDays);
                                    const minDateStr = minDate.toISOString().split('T')[0];

                                    return (
                                        <Card key={index} withBorder radius="md" p="md" shadow="xs">
                                            <Grid align="flex-end">
                                                <Grid.Col span={{ base: 12, md: 4 }}>
                                                    <Select
                                                        label="Product Lookup"
                                                        placeholder="Search products"
                                                        data={products.map(p => ({ value: p.id + "", label: p.name }))}
                                                        searchable
                                                        onChange={(val) => handleProductSelect(index, val || "")}
                                                        radius="md"
                                                        value={selectedProdId}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={{ base: 12, md: 5 }}>
                                                    <TextInput
                                                        label="Remark (Item Details)"
                                                        placeholder="Optional item specifics"
                                                        radius="md"
                                                        {...poForm.getInputProps(`items.${index}.remarks`)}
                                                    />
                                                </Grid.Col>
                                                <Grid.Col span={{ base: 12, md: 3 }} ta="right">
                                                    <Button color="red" variant="subtle" size="xs" leftSection={<IconTrash size={14} />} onClick={() => poForm.removeListItem('items', index)}>
                                                        Remove Item
                                                    </Button>
                                                </Grid.Col>

                                                <Grid.Col span={{ base: 6, md: 3 }}>
                                                    <NumberInput
                                                        label="Quantity"
                                                        min={1}
                                                        radius="md"
                                                        {...poForm.getInputProps(`items.${index}.quantity`)}
                                                        onChange={(val) => {
                                                            const q = Number(val) || 0;
                                                            poForm.setFieldValue(`items.${index}.quantity`, q);
                                                            calculateItemTotal(index, q, undefined);
                                                        }}
                                                    />
                                                </Grid.Col>
                                                {/* <Grid.Col span={{ base: 6, md: 3 }}>
                                                    <NumberInput
                                                        label="Unit Price (INR)"
                                                        radius="md"
                                                        {...poForm.getInputProps(`items.${index}.unitPrice`)}
                                                        onChange={(val) => {
                                                            const u = Number(val) || 0;
                                                            poForm.setFieldValue(`items.${index}.unitPrice`, u);
                                                            calculateItemTotal(index, undefined, u);
                                                        }}
                                                    />
                                                </Grid.Col> */}
                                                <Grid.Col span={{ base: 12, md: 6 }}>
                                                    <TextInput
                                                        label="Expected Delivery Date"
                                                        type="date"
                                                        description={selectedProd ? `Pre-filled min: ${minDateStr}` : ""}
                                                        min={minDateStr}
                                                        {...poForm.getInputProps(`items.${index}.expectedDeliveryDate`)}
                                                    />
                                                </Grid.Col>
                                            </Grid>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </ScrollArea.Autosize>

                        <Group justify="space-between" mt="md" p="md" style={{ borderRadius: 8 }}>
                            <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddItem}>
                                Add Item
                            </Button>
                            {/* <Box ta="right">
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Amount</Text>
                                <Title order={2} c="blue">INR {grandTotal.toLocaleString()}</Title>
                            </Box> */}
                        </Group>

                        <Group justify="flex-end">
                            <Button variant="subtle" color="gray" onClick={close}>Cancel</Button>
                            <Button type="submit" size="md" radius="md" px="xl" variant="gradient" gradient={{ from: 'blue', to: 'indigo' }} loading={submitting}>
                                {isEditing ? 'Save Changes' : 'Create Purchase Order'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Details Modal */}
            <Modal
                opened={detailsOpened}
                onClose={closeDetails}
                title={<Group gap="xs"><IconShoppingCart size={24} color="var(--mantine-color-blue-filled)" /><Title order={3}>PO Details: {selectedOrder?.poNumber}</Title></Group>}
                size="75%"
                radius="lg"
            >
                {selectedOrder && (
                    <Stack gap="xl">
                        <Grid mt="md">
                            <Grid.Col span={4}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>PO Date</Text>
                                <Text fw={600} size="lg">{new Date(selectedOrder.poDate).toLocaleString()}</Text>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Division</Text>
                                <Text fw={600} size="lg">{selectedOrder.division?.name || '—'}</Text>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Status</Text>
                                <Badge size="lg" radius="sm" color={statusColors[selectedOrder.status]}>{selectedOrder.status.replace(/_/g, ' ')}</Badge>
                            </Grid.Col>
                        </Grid>

                        <Paper withBorder p="md" radius="md" style={{ backgroundColor: 'var(--mantine-color-blue-light)' }}>
                            <Text size="xs" fw={900} tt="uppercase" mb={4}>Remarks</Text>
                            <Text size="sm">{selectedOrder.remarks || "No remarks provided"}</Text>
                        </Paper>

                        <Divider label={<Group gap={4}><IconPackage size={14} />Items Status</Group>} labelPosition="center" />

                        <Table verticalSpacing="sm" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Product</Table.Th>
                                    {canSeeSupplier && <Table.Th>Supplier</Table.Th>}
                                    <Table.Th>Expected Delivery</Table.Th>
                                    <Table.Th ta="center">PO Qty</Table.Th>
                                    <Table.Th ta="center">Dispatched</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {selectedOrder.items.map((item: any) => {
                                    // Count only dispatches at SHIPPED or above
                                    const ACTIVE_STATUSES = new Set(['SHIPPED', 'IN_TRANSIT', 'DELIVERED']);
                                    const shippedQty = relatedDispatches
                                        .filter((d: any) => ACTIVE_STATUSES.has(d.status))
                                        .flatMap((d: any) => d.items || [])
                                        .filter((di: any) => di.poItemId === item.id)
                                        .reduce((sum: number, di: any) => sum + (di.quantity || 0), 0);

                                    const isFullyShipped = shippedQty >= item.quantity;
                                    return (
                                        <Table.Tr key={item.id}>
                                            <Table.Td>
                                                <Text size="sm" fw={600}>{item.product?.name || item.productName}</Text>
                                                {item.remarks && <Text size="xs" c="dimmed">{item.remarks}</Text>}
                                            </Table.Td>
                                            {canSeeSupplier && (
                                                <Table.Td>
                                                    <Text size="sm">{item.product?.supplier?.companyName || '—'}</Text>
                                                </Table.Td>
                                            )}
                                            <Table.Td>
                                                <Group gap={4}>
                                                    <IconClock size={12} color="gray" />
                                                    <Text size="xs">{item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                <Text fw={700}>{item.quantity}</Text>
                                            </Table.Td>
                                            <Table.Td ta="center">
                                                {shippedQty > 0 ? (
                                                    <Text fw={600} c={isFullyShipped ? 'green' : 'orange'}>
                                                        {shippedQty}
                                                        {isFullyShipped && ' ✓'}
                                                    </Text>
                                                ) : (
                                                    <Text size="xs" c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>

                        <Group justify="flex-end">
                            {/* <Box ta="right">
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Grand Total</Text>
                                <Title order={2} c="blue">INR {selectedOrder.items.reduce((sum: number, i: any) => sum + Number(i.totalPrice), 0).toLocaleString()}</Title>
                            </Box> */}
                        </Group>

                        {/* Approval Section */}

                        <Paper withBorder p="xl" radius="md" shadow="xs" style={{ borderLeft: '5px solid var(--mantine-color-blue-filled)' }}>
                            <Stack gap="md">
                                <Group justify="space-between">
                                    <Text fw={900} size="lg" tt="uppercase">Approval Workflow</Text>
                                    <Badge variant="outline" color="blue">Level {selectedOrder.status === 'PENDING_L1' ? '1' : selectedOrder.status === 'APPROVED_L1' ? '2' : 'N/A'}</Badge>
                                </Group>

                                <Group gap="md">
                                    {selectedOrder.status === 'DRAFT' && (
                                        <Button color="blue" size="md" leftSection={<IconClock size={18} />} onClick={handleSubmitL1} loading={submitting}>
                                            Submit for Level 1 Approval
                                        </Button>
                                    )}

                                    {(approvals.L1.includes(user?.role as string) || approvals.L2.includes(user?.role as string)) && (
                                        <>

                                            {selectedOrder.status === 'PENDING_L1' && approvals.L1.includes(user?.role as string) && (
                                                <>
                                                    <Button color="green" size="md" onClick={() => handleOpenApprovalModal('APPROVED', 1)}>Grant L1 Approval</Button>
                                                    <Button color="red" variant="outline" size="md" onClick={() => handleOpenApprovalModal('REJECTED', 1)}>Reject L1 Request</Button>
                                                </>
                                            )}
                                            {selectedOrder.status === 'APPROVED_L1' && approvals.L2.includes(user?.role as string) && (
                                                <Stack gap="xs" style={{ width: '100%' }}>
                                                    {/* {selectedOrder.items.some((i: any) => i.availableStock < i.quantity) && (
                                                    <Alert variant="filled" color="red" icon={<IconAlertTriangle size={16} />}>
                                                        L2 Approval Blocked: One or more items in this PO exceed available inventory stock.
                                                    </Alert>
                                                )} */}
                                                    <Group>
                                                        <Button
                                                            color="indigo"
                                                            size="lg"
                                                            // disabled={selectedOrder.items.some((i: any) => i.availableStock < i.quantity)}
                                                            onClick={() => handleOpenApprovalModal('APPROVED', 2)}
                                                        >
                                                            Confirm & Place Order (L2)
                                                        </Button>
                                                        <Button
                                                            color="red"
                                                            variant="subtle"
                                                            onClick={() => handleOpenApprovalModal('REJECTED', 2)}
                                                        >
                                                            Reject L2 Request
                                                        </Button>
                                                    </Group>
                                                </Stack>
                                            )}
                                            {!['DRAFT', 'PENDING_L1', 'APPROVED_L1'].includes(selectedOrder.status) && (
                                                <Text c="dimmed" size="sm" fs="italic">Workflow completed or in production stage.</Text>
                                            )}
                                        </>
                                    )}
                                </Group>
                            </Stack>
                        </Paper>


                        {trackingHistory.length > 0 && (
                            <Stack gap="md">
                                <Divider label={<Group gap={4}><IconShip size={14} />Logistics & Tracking Timeline</Group>} labelPosition="center" />
                                <Timeline active={0} bulletSize={30} lineWidth={3}>
                                    {trackingHistory.map((update) => (
                                        <Timeline.Item
                                            key={update.id}
                                            title={<Text fw={900} size="md">{update.stage.replace(/_/g, ' ')}</Text>}
                                            bullet={<IconShip size={14} />}
                                        >
                                            <Group gap="xs" mt={4}>
                                                <Badge size="xs" variant="light" color="blue" leftSection={<IconUser size={10} />}>
                                                    {update.updatedByUser?.username || update.updatedBy || 'System'}
                                                </Badge>
                                                <Text size="xs" c="dimmed">{new Date(update.timestamp).toLocaleString()}</Text>
                                            </Group>
                                            <Paper withBorder p="xs" mt="xs" radius="sm">
                                                <Text size="sm">{update.notes || "No status details provided"}</Text>
                                            </Paper>
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                            </Stack>
                        )}

                        {relatedDispatches.length > 0 && (
                            <Stack gap="md">
                                <Divider label={<Group gap={4}><IconPackage size={14} />Dispatch History</Group>} labelPosition="center" />
                                <Stack gap="xs">
                                    {relatedDispatches.map((d: any) => {
                                        const dispatchColor: Record<string, string> = {
                                            DRAFT: 'gray', PACKED: 'violet', SHIPPED: 'indigo',
                                            IN_TRANSIT: 'cyan', DELIVERED: 'green',
                                            RETURNED: 'orange', CANCELLED: 'red'
                                        };
                                        return (
                                            <Paper key={d.id} withBorder p="sm" radius="md">
                                                <Group justify="space-between" mb="xs">
                                                    <Group gap="xs">
                                                        <Text size="sm" fw={700} c="blue">#{d.id}</Text>
                                                        {d.referenceNumber && <Text size="xs" c="dimmed">({d.referenceNumber})</Text>}
                                                    </Group>
                                                    <Group gap="xs">
                                                        <Badge size="sm" color={dispatchColor[d.status] || 'gray'} variant="light">
                                                            {d.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                        <Text size="xs" c="dimmed">{new Date(d.createdAt).toLocaleDateString()}</Text>
                                                    </Group>
                                                </Group>
                                                <Table verticalSpacing={4} fz="xs">
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Product</Table.Th>
                                                            <Table.Th ta="center">Dispatched Qty</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {(d.items || []).map((di: any) => {
                                                            // Match product name from PO items by poItemId
                                                            const matchedPOItem = selectedOrder?.items?.find(
                                                                (pi: any) => pi.id === di.poItemId
                                                            );
                                                            const productName =
                                                                di.poItem?.product?.name ||
                                                                matchedPOItem?.product?.name ||
                                                                matchedPOItem?.productName ||
                                                                `Item #${di.poItemId}`;
                                                            return (
                                                                <Table.Tr key={di.id ?? di.poItemId}>
                                                                    <Table.Td>
                                                                        <Text size="xs" fw={500}>{productName}</Text>
                                                                    </Table.Td>
                                                                    <Table.Td ta="center">
                                                                        <Badge size="xs" variant="outline" color="blue">{di.quantity}</Badge>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            );
                                                        })}
                                                    </Table.Tbody>
                                                </Table>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            </Stack>
                        )}

                        <Group justify="space-between" mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                            <Group>
                                {selectedOrder.status === 'DRAFT' && (
                                    <Button variant="subtle" color="blue" leftSection={<IconEdit size={18} />} onClick={() => { closeDetails(); handleEdit(selectedOrder); }}>Modify Draft</Button>
                                )}
                            </Group>
                            <Button variant="subtle" color="gray" size="md" onClick={closeDetails}>Close Overview</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Approval Decision Modal */}
            <Modal
                opened={approvalModalOpened}
                onClose={closeApproval}
                title={<Title order={4}>L{approvalForm.values.level} Approval Decision</Title>}
                radius="md"
            >
                <form onSubmit={approvalForm.onSubmit(onSubmitApproval)}>
                    <Stack>
                        <TextInput
                            label="Remarks"
                            placeholder="Reason for decision"
                            required={approvalForm.values.decision === 'REJECTED'}
                            {...approvalForm.getInputProps('remarks')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" color="gray" onClick={closeApproval}>Cancel</Button>
                            <Button
                                color={approvalForm.values.decision === 'REJECTED' ? 'red' : 'green'}
                                type="submit"
                                loading={submitting}
                            >
                                Confirm {approvalForm.values.level === 2 && approvalForm.values.decision === 'APPROVED' ? 'Order Placed' : approvalForm.values.decision}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>


        </Box>
    );
}

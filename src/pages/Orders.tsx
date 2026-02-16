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
    Timeline
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
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useMediaQuery, useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { notifications } from "@mantine/notifications";

export function Orders() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { user, isAdmin } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [trackingHistory, setTrackingHistory] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [isEditing, setIsEditing] = useState(false);

    const [opened, { open, close }] = useDisclosure(false);
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
    const [approvalModalOpened, { open: openApproval, close: closeApproval }] = useDisclosure(false);
    const [trackingModalOpened, { open: openTracking, close: closeTracking }] = useDisclosure(false);

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [search, setSearch] = useState("");

    // PO Creation Form
    const poForm = useForm({
        initialValues: {
            supplierId: "",
            divisionId: "",
            remarks: "",
            items: [
                { productId: "", productName: "", sku: "", quantity: 1, unitPrice: 0, totalPrice: 0, remarks: "", expectedDeliveryDate: "" }
            ]
        },
        validate: {
            supplierId: (value) => (!value ? 'Supplier is required' : null),
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

    // Tracking Update Form
    const trackingForm = useForm({
        initialValues: {
            stage: "IN_PRODUCTION",
            notes: "",
            photoUrl: "",
            updatePOStatus: true
        }
    });

    const fetchData = async () => {
        try {
            const [ordersData, suppliersData, divisionsData, productsData] = await Promise.all([
                api.getOrders(),
                api.getSuppliers(),
                api.getDivisions(),
                api.getProducts()
            ]);
            setOrders(ordersData || []);
            setSuppliers(suppliersData || []);
            setDivisions(divisionsData || []);
            setProducts(productsData || []);

            // Only admins can see/fetch users list
            if (isAdmin) {
                const usersData = await api.getAuthUsers();
                setUsers(usersData || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData();
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
            const date = new Date();
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
            const [tracking] = await Promise.all([
                api.getTrackingHistory(order.id),
                // api.getInventory()
            ]);

            // Map inventory quantity to items
            const enrichedItems = order.items.map((item: any) => {
                return { ...item, availableStock: 0 };
            });

            setSelectedOrder({ ...order, items: enrichedItems });
            setTrackingHistory(tracking);
        } catch (err) {
            console.error("Error fetching details:", err);
            setTrackingHistory([]);
        }
        openDetails();
    };

    const handleOpenTracking = () => {
        trackingForm.reset();
        openTracking();
    };

    const onSubmitTracking = async (values: typeof trackingForm.values) => {
        try {
            await api.addTrackingUpdate({
                poId: selectedOrder.id,
                ...values,
                updatePOStatus: true  // This ensures PO status updates, triggering inventory changes
            });
            closeTracking();
            await handleViewDetails(selectedOrder);
            fetchData();
            notifications.show({ title: "Updated", message: "Tracking stage recorded", color: "blue" });
        } catch (error) {
            console.error("Error adding tracking update:", error);
        }
    };

    const handleOpenApprovalModal = (decision: "APPROVED" | "REJECTED", level: number) => {
        if (!isAdmin) {
            notifications.show({ title: "Access Denied", message: "Operations users cannot perform approvals", color: "red" });
            return;
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
        try {
            await api.submitApproval({
                poId: selectedOrder.id,
                ...values
            });

            closeApproval();
            await handleViewDetails(selectedOrder);
            fetchData();
            close();
            notifications.show({ title: "Success", message: `PO level ${values.level} ${values.decision.toLowerCase()}`, color: "green" });
        } catch (error) {
            notifications.show({ title: "Error", message: error instanceof Error ? error.message : "Approval failed", color: "red" });
        }
    };

    const handleOpen = () => {
        setIsEditing(false);
        poForm.reset();
        open();
    };

    const handleEdit = (order: any) => {
        setIsEditing(true);
        setSelectedOrder(order);
        poForm.setValues({
            supplierId: order.supplierId.toString(),
            divisionId: order.divisionId.toString() || "",
            remarks: order.remarks || "",
            items: order.items.map((item: any) => ({
                productId: item.productId.toString() || "",
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
        try {
            if (isEditing && selectedOrder) {
                await api.updateOrder(selectedOrder.id, values);
            } else {
                await api.createOrder(values);
            }
            close();
            fetchData();
            notifications.show({ title: "Success", message: `Order ${isEditing ? 'updated' : 'created'} successfully`, color: "green" });
        } catch (error) {
            console.error("Error saving order:", error);
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
            o.supplier?.companyName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const statusColors: Record<string, string> = {
        DRAFT: 'gray',
        PENDING_L1: 'yellow',
        APPROVED_L1: 'blue',
        REJECTED_L1: 'red',
        ORDER_PLACED: 'green',
        IN_PRODUCTION: 'orange',
        QUALITY_INSPECTION: 'pink',
        READY_TO_SHIP: 'cyan',
        SHIPPED: 'indigo',
        IN_TRANSIT: 'violet',
        PORT_CLEARANCE: 'lime',
        DELIVERED: 'teal',
        RETURNED: 'grape',
        CLOSED: 'dark'
    };

    const rows = filteredOrders.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text fw={700} c="blue">{element.poNumber}</Text>
                <Text size="xs" c="dimmed">{new Date(element.poDate).toLocaleString()}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconUser size={14} />
                    <Text size="sm">{element.supplier?.companyName}</Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconBuildingSkyscraper size={14} />
                    <Text size="sm">{element.division?.name || '-'}</Text>
                </Group>
            </Table.Td>
            {/* <Table.Td>
                <Text fw={600}>INR {element.items.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0).toLocaleString()}</Text>
            </Table.Td> */}
            <Table.Td>
                <Badge variant="light" color={statusColors[element.status] || 'blue'}>
                    {element.status.replace(/_/g, ' ')}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group justify="flex-end">
                    <ActionIcon variant="subtle" color="blue" onClick={() => handleViewDetails(element)}>
                        <IconExternalLink size={18} />
                    </ActionIcon>
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
                    <Group align="flex-end">
                        <Select
                            label="Filter Status"
                            placeholder="All Statuses"
                            data={['ALL', ...Object.keys(statusColors)]}
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val || 'ALL')}
                            style={{ width: 180 }}
                            leftSection={<IconFilter size={16} />}
                        />
                        <TextInput
                            placeholder="Search PO # or Supplier"
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            style={{ width: 250 }}
                        />
                        <Button variant="gradient" gradient={{ from: 'blue', to: 'indigo' }} leftSection={<IconPlus size={18} />} onClick={handleOpen}>
                            New PO
                        </Button>
                    </Group>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <Table.ScrollContainer minWidth={900}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>PO Details</Table.Th>
                                    <Table.Th>Supplier</Table.Th>
                                    <Table.Th>Division</Table.Th>
                                    {/* <Table.Th>Total Amount</Table.Th> */}
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
                                <Select
                                    label="Supplier"
                                    placeholder="Select supplier"
                                    data={suppliers.map(s => ({ value: s.id + "", label: s.companyName }))}
                                    withAsterisk
                                    radius="md"
                                    leftSection={<IconUser size={16} />}
                                    {...poForm.getInputProps('supplierId')}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Select
                                    label="Division"
                                    placeholder="Select division"
                                    data={divisions.map(d => ({ value: d.id + "", label: d.name }))}
                                    radius="md"
                                    leftSection={<IconBuildingSkyscraper size={16} />}
                                    {...poForm.getInputProps('divisionId')}
                                />
                            </Grid.Col>
                            <Grid.Col span={12}>
                                <TextInput
                                    label="Remarks"
                                    placeholder="General remarks for this PO"
                                    radius="md"
                                    {...poForm.getInputProps('remarks')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Divider label="Order Items" labelPosition="center" />

                        <ScrollArea.Autosize mah={500} type="always">
                            <Stack gap="sm">
                                {poForm.values.items.map((_, index) => {
                                    const selectedProdId = poForm.values.items[index].productId;
                                    const selectedProd = products.find(p => p.id === selectedProdId);

                                    // Calculate prefilled date (Today + minDeliveryDays)
                                    const minDays = selectedProd?.minDeliveryDays || 0;
                                    const minDate = new Date();
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
                            <Button type="submit" size="md" radius="md" px="xl" variant="gradient" gradient={{ from: 'blue', to: 'indigo' }}>
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
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Supplier</Text>
                                <Text fw={700} size="lg">{selectedOrder.supplier?.companyName}</Text>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>PO Date</Text>
                                <Text fw={600} size="lg">{new Date(selectedOrder.poDate).toLocaleString()}</Text>
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
                                    <Table.Th>Expected Delivery</Table.Th>
                                    {/* {isAdmin && <Table.Th ta="center">In Stock</Table.Th>} */}
                                    <Table.Th ta="center">PO Qty</Table.Th>
                                    {/* <Table.Th ta="right">Total</Table.Th> */}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {selectedOrder.items.map((item: any) => {
                                    const isLowStock = isAdmin && (item.availableStock < item.quantity);
                                    return (
                                        <Table.Tr key={item.id}>
                                            <Table.Td>
                                                <Text size="sm" fw={600}>{item.product?.name || item.productName}</Text>
                                                {item.remarks && <Text size="xs" c="dimmed">{item.remarks}</Text>}
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    <IconClock size={12} color="gray" />
                                                    <Text size="xs">{item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</Text>
                                                </Group>
                                            </Table.Td>
                                            {/* {isAdmin && (
                                                <Table.Td ta="center">
                                                    <Badge
                                                        variant="filled"
                                                        color={isLowStock ? 'red' : 'green'}
                                                        size="sm"
                                                    >
                                                        {item.availableStock || 0}
                                                    </Badge>
                                                </Table.Td>
                                            )} */}
                                            <Table.Td ta="center">
                                                <Text fw={700} c={isLowStock ? 'inherit' : 'inherit'}>{item.quantity}</Text>
                                            </Table.Td>
                                            {/* <Table.Td ta="right">{Number(item.unitPrice).toLocaleString()}</Table.Td> */}
                                            {/* <Table.Td ta="right" fw={900} c="blue">INR {Number(item.totalPrice).toLocaleString()}</Table.Td> */}
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
                        {isAdmin && (
                            <Paper withBorder p="xl" radius="md" shadow="xs" style={{ borderLeft: '5px solid var(--mantine-color-blue-filled)' }}>
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text fw={900} size="lg" tt="uppercase">Approval Workflow</Text>
                                        <Badge variant="outline" color="blue">Level {selectedOrder.status === 'PENDING_L1' ? '1' : selectedOrder.status === 'APPROVED_L1' ? '2' : 'N/A'}</Badge>
                                    </Group>

                                    <Group gap="md">
                                        {selectedOrder.status === 'DRAFT' && (
                                            <Button color="blue" size="md" leftSection={<IconClock size={18} />} onClick={() => api.updateOrder(selectedOrder.id, { status: 'PENDING_L1' }).then(fetchData).then(closeDetails)}>
                                                Submit for Level 1 Approval
                                            </Button>
                                        )}
                                        {selectedOrder.status === 'PENDING_L1' && (
                                            <>
                                                <Button color="green" size="md" onClick={() => handleOpenApprovalModal('APPROVED', 1)}>Grant L1 Approval</Button>
                                                <Button color="red" variant="outline" size="md" onClick={() => handleOpenApprovalModal('REJECTED', 1)}>Reject L1 Request</Button>
                                            </>
                                        )}
                                        {selectedOrder.status === 'APPROVED_L1' && (
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
                                    </Group>
                                </Stack>
                            </Paper>
                        )}

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

                        <Group justify="space-between" mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                            <Group>
                                {(selectedOrder.status === 'ORDER_PLACED' || selectedOrder.status.includes('IN_') || ['QUALITY_INSPECTION', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'PORT_CLEARANCE', 'DELIVERED', 'RETURNED'].includes(selectedOrder.status)) && (
                                    <Button size="md" variant="gradient" gradient={{ from: 'teal', to: 'lime' }} leftSection={<IconShip size={18} />} onClick={handleOpenTracking}>Record Tracking Update</Button>
                                )}
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
                            >
                                Confirm {approvalForm.values.level === 2 && approvalForm.values.decision === 'APPROVED' ? 'Order Placed' : approvalForm.values.decision}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Tracking Modal */}
            <Modal opened={trackingModalOpened} onClose={closeTracking} title="Add Tracking Update">
                <form onSubmit={trackingForm.onSubmit(onSubmitTracking)}>
                    <Stack>
                        <Select
                            label="Current Stage"
                            data={['IN_PRODUCTION', 'QUALITY_INSPECTION', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'PORT_CLEARANCE', 'DELIVERED', 'RETURNED', 'CLOSED']}
                            {...trackingForm.getInputProps('stage')}
                        />
                        <TextInput label="Notes" {...trackingForm.getInputProps('notes')} />
                        <Group justify="flex-end">
                            <Button variant="subtle" color="gray" onClick={closeTracking}>Cancel</Button>
                            <Button type="submit">Update</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

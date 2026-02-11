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
    Image,
    Checkbox
} from "@mantine/core";
import {
    IconPlus,
    IconExternalLink,
    IconTrash,
    IconSearch,
    IconCalendar,
    IconUser,
    IconBuildingSkyscraper,
    IconCheck,
    IconX,
    IconShip,
    IconPhoto,
    IconMessageDots,
    IconEdit,
    IconFilter
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useMediaQuery, useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { api } from "../api/client";

export function Orders() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [orders, setOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
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
            expectedDeliveryDate: "",
            currency: "USD",
            paymentTerms: "",
            remarks: "",
            items: [
                { productId: "", productName: "", sku: "", quantity: 1, unitPrice: 0, totalPrice: 0, remarks: "" }
            ]
        },
        validate: {
            supplierId: (value) => (!value ? 'Supplier is required' : null),
            items: {
                productName: (value: string) => (!value ? 'Product name is required' : null),
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
            stage: "In Production",
            notes: "",
            photoUrl: "",
            updatePOStatus: true
        }
    });

    const fetchData = async () => {
        try {
            const [ordersData, suppliersData, divisionsData, productsData, usersData] = await Promise.all([
                api.getOrders(),
                api.getSuppliers(),
                api.getDivisions(),
                api.getProducts(),
                api.getUsers()
            ]);
            setOrders(ordersData);
            setSuppliers(suppliersData);
            setDivisions(divisionsData);
            setProducts(productsData);
            setUsers(usersData);
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
            remarks: ""
        });
    };

    const handleProductSelect = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            poForm.setFieldValue(`items.${index}.productName`, product.name);
            poForm.setFieldValue(`items.${index}.sku`, product.sku || "");
        }
    };

    const calculateItemTotal = (index: number) => {
        const item = poForm.values.items[index];
        const total = (item.quantity || 0) * (item.unitPrice || 0);
        poForm.setFieldValue(`items.${index}.totalPrice`, total);
    };

    const grandTotal = poForm.values.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    const handleViewDetails = async (order: any) => {
        setSelectedOrder(order);
        try {
            const [approvals, tracking] = await Promise.all([
                api.getApprovalHistory(order.id),
                api.getTrackingHistory(order.id)
            ]);
            setApprovalHistory(approvals);
            setTrackingHistory(tracking);
        } catch (err) {
            setApprovalHistory([]);
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
                ...values
            });
            closeTracking();
            const [updated, tracking] = await Promise.all([
                api.getOrder(selectedOrder.id),
                api.getTrackingHistory(selectedOrder.id)
            ]);
            setSelectedOrder(updated);
            setTrackingHistory(tracking);
            fetchData();
        } catch (error) {
            console.error("Error adding tracking update:", error);
        }
    };

    const handleOpenApprovalModal = (decision: "APPROVED" | "REJECTED", level: number) => {
        approvalForm.setValues({
            decision,
            level,
            approverId: users.find(u => u.role === (level === 2 ? 'FINANCE' : 'PURCHASE_MANAGER'))?.id || users[0]?.id || "",
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
            const updated = await api.getOrder(selectedOrder.id);
            setSelectedOrder(updated);
            const history = await api.getApprovalHistory(selectedOrder.id);
            setApprovalHistory(history);
            fetchData();
        } catch (error) {
            console.error("Error submitting approval:", error);
        }
    };

    const handleOpen = () => {
        setIsEditing(false);
        poForm.reset();
        open();
    };

    const handleEdit = (order: any) => {
        setIsEditing(true);
        setSelectedOrder(order); // Set selected order for update
        poForm.setValues({
            supplierId: order.supplierId,
            divisionId: order.divisionId || "",
            expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : "",
            currency: order.currency || "USD",
            paymentTerms: order.paymentTerms || "",
            remarks: order.remarks || "",
            items: order.items.map((item: any) => ({
                productId: item.productId || "",
                productName: item.productName,
                sku: item.sku || "",
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                remarks: item.remarks || ""
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
        } catch (error) {
            console.error("Error saving order:", error);
        }
    };

    const handleSeedUsers = async () => {
        await api.seedUsers();
        fetchData();
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
            o.supplier?.companyName.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const statusColors: Record<string, string> = {
        DRAFT: 'gray',
        PENDING_APPROVAL: 'yellow',
        APPROVED: 'green',
        REJECTED: 'red',
        SENT_TO_SUPPLIER: 'blue',
        DELIVERED: 'teal',
        CLOSED: 'dark'
    };

    const rows = filteredOrders.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text fw={700} c="blue">{element.poNumber}</Text>
                <Text size="xs" c="dimmed">{new Date(element.poDate).toLocaleDateString()}</Text>
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
            <Table.Td>
                <Text fw={600}>{element.currency} {element.items.reduce((sum: number, item: any) => sum + Number(item.totalPrice), 0).toLocaleString()}</Text>
            </Table.Td>
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
                            data={['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT_TO_SUPPLIER', 'DELIVERED', 'CLOSED']}
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
                        <Button variant="light" color="indigo" onClick={handleSeedUsers}>
                            Seed Approvers
                        </Button>
                    </Group>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <Group mb="lg">
                        <TextInput
                            placeholder="Search by PO number or supplier..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            style={{ flex: 1 }}
                            radius="md"
                        />
                    </Group>

                    <Table.ScrollContainer minWidth={900}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>PO Details</Table.Th>
                                    <Table.Th>Supplier</Table.Th>
                                    <Table.Th>Division</Table.Th>
                                    <Table.Th>Total Amount</Table.Th>
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
                size="70%"
                fullScreen={isMobile}
                radius="md"
                padding="xl"
                overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
            >
                <form onSubmit={poForm.onSubmit(onSubmit)}>
                    <Stack gap="xl">
                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Select
                                    label="Supplier"
                                    placeholder="Select supplier"
                                    data={suppliers.map(s => ({ value: s.id, label: s.companyName }))}
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
                                    data={divisions.map(d => ({ value: d.id, label: d.name }))}
                                    radius="md"
                                    leftSection={<IconBuildingSkyscraper size={16} />}
                                    {...poForm.getInputProps('divisionId')}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <TextInput
                                    label="Expected Delivery"
                                    type="date"
                                    radius="md"
                                    leftSection={<IconCalendar size={16} />}
                                    {...poForm.getInputProps('expectedDeliveryDate')}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Select
                                    label="Currency"
                                    data={['USD', 'EUR', 'INR', 'AED']}
                                    radius="md"
                                    {...poForm.getInputProps('currency')}
                                />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <TextInput
                                    label="Payment Terms"
                                    placeholder="e.g. Net 30"
                                    radius="md"
                                    {...poForm.getInputProps('paymentTerms')}
                                />
                            </Grid.Col>
                        </Grid>

                        <Divider label="Order Items" labelPosition="center" />

                        <ScrollArea.Autosize mah={400} type="always">
                            <Stack gap="sm">
                                {poForm.values.items.map((_, index) => (
                                    <Card key={index} withBorder radius="md" p="sm">
                                        <Grid align="flex-end">
                                            <Grid.Col span={{ base: 12, md: 4 }}>
                                                <Select
                                                    label="Product (Lookup)"
                                                    placeholder="Search products"
                                                    data={products.map(p => ({ value: p.id, label: p.name }))}
                                                    searchable
                                                    onChange={(val) => handleProductSelect(index, val || "")}
                                                    radius="md"
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, md: 5 }}>
                                                <TextInput
                                                    label="Item Description"
                                                    placeholder="Product name or details"
                                                    withAsterisk
                                                    radius="md"
                                                    {...poForm.getInputProps(`items.${index}.productName`)}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 12, md: 3 }} ta="right">
                                                <ActionIcon color="red" variant="subtle" onClick={() => poForm.removeListItem('items', index)}>
                                                    <IconTrash size={18} />
                                                </ActionIcon>
                                            </Grid.Col>

                                            <Grid.Col span={{ base: 6, md: 2 }}>
                                                <TextInput
                                                    label="SKU"
                                                    radius="md"
                                                    {...poForm.getInputProps(`items.${index}.sku`)}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 6, md: 3 }}>
                                                <NumberInput
                                                    label="Quantity"
                                                    min={1}
                                                    radius="md"
                                                    {...poForm.getInputProps(`items.${index}.quantity`)}
                                                    onChange={(val) => {
                                                        poForm.setFieldValue(`items.${index}.quantity`, Number(val));
                                                        calculateItemTotal(index);
                                                    }}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 6, md: 3 }}>
                                                <NumberInput
                                                    label="Unit Price"
                                                    decimalScale={2}
                                                    radius="md"
                                                    {...poForm.getInputProps(`items.${index}.unitPrice`)}
                                                    onChange={(val) => {
                                                        poForm.setFieldValue(`items.${index}.unitPrice`, Number(val));
                                                        calculateItemTotal(index);
                                                    }}
                                                />
                                            </Grid.Col>
                                            <Grid.Col span={{ base: 6, md: 4 }}>
                                                <TextInput
                                                    label="Item Total"
                                                    readOnly
                                                    fw={700}
                                                    radius="md"
                                                    value={poForm.values.items[index].totalPrice.toLocaleString()}
                                                />
                                            </Grid.Col>
                                        </Grid>
                                    </Card>
                                ))}
                            </Stack>
                        </ScrollArea.Autosize>

                        <Group justify="space-between">
                            <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleAddItem}>
                                Add Row
                            </Button>
                            <Box ta="right">
                                <Text size="sm" c="dimmed">Grand Total</Text>
                                <Title order={2}>{poForm.values.currency} {grandTotal.toLocaleString()}</Title>
                            </Box>
                        </Group>

                        <Divider />

                        <Group justify="flex-end">
                            <Button variant="subtle" color="gray" onClick={close}>Cancel</Button>
                            <Button type="submit" size="md" radius="md" px="xl">Create Order</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Details Modal */}
            <Modal
                opened={detailsOpened}
                onClose={closeDetails}
                title={<Text fw={900} size="xl">Order Details: {selectedOrder?.poNumber}</Text>}
                size="lg"
                overlayProps={{ blur: 3 }}
            >
                {selectedOrder && (
                    <Stack gap="lg">
                        <Grid>
                            <Grid.Col span={6}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Supplier</Text>
                                <Text fw={600}>{selectedOrder.supplier?.companyName}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Date</Text>
                                <Text fw={600}>{new Date(selectedOrder.poDate).toLocaleDateString()}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Division</Text>
                                <Text fw={600}>{selectedOrder.division?.name || '-'}</Text>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Status</Text>
                                <Badge color={statusColors[selectedOrder.status]}>{selectedOrder.status}</Badge>
                            </Grid.Col>
                        </Grid>

                        <Divider label="Items" labelPosition="center" />

                        <Table striped withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Item</Table.Th>
                                    <Table.Th ta="center">Qty</Table.Th>
                                    <Table.Th ta="right">Price</Table.Th>
                                    <Table.Th ta="right">Total</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {selectedOrder.items.map((item: any) => (
                                    <Table.Tr key={item.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{item.productName}</Text>
                                            <Text size="xs" c="dimmed">{item.sku}</Text>
                                        </Table.Td>
                                        <Table.Td ta="center">{item.quantity}</Table.Td>
                                        <Table.Td ta="right">{Number(item.unitPrice).toLocaleString()}</Table.Td>
                                        <Table.Td ta="right" fw={700}>{Number(item.totalPrice).toLocaleString()}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>

                        <Group justify="flex-end" px="md">
                            <Box ta="right">
                                <Text size="xs" c="dimmed">PO TOTAL</Text>
                                <Title order={3}>
                                    {selectedOrder.currency} {selectedOrder.items.reduce((sum: number, i: any) => sum + Number(i.totalPrice), 0).toLocaleString()}
                                </Title>
                            </Box>
                        </Group>

                        {approvalHistory.length > 0 && (
                            <>
                                <Divider label="Approval History" labelPosition="center" />
                                <Table verticalSpacing="xs">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Level</Table.Th>
                                            <Table.Th>Approver</Table.Th>
                                            <Table.Th>Decision</Table.Th>
                                            <Table.Th>Remarks</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {approvalHistory.map((h) => (
                                            <Table.Tr key={h.id}>
                                                <Table.Td><Badge variant="outline" size="sm">L{h.level}</Badge></Table.Td>
                                                <Table.Td><Text size="xs">{h.approver?.email}</Text></Table.Td>
                                                <Table.Td>
                                                    <Badge color={h.decision === 'REJECTED' ? 'red' : 'green'} size="sm">
                                                        {h.decision}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td><Text size="xs">{h.remarks}</Text></Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </>
                        )}

                        {trackingHistory.length > 0 && (
                            <>
                                <Divider label="Order Tracking Timeline" labelPosition="center" />
                                <Box px="md">
                                    <Timeline active={0} bulletSize={24} lineWidth={2}>
                                        {trackingHistory.map((update, index) => (
                                            <Timeline.Item
                                                key={update.id}
                                                bullet={index === 0 ? <IconCheck size={12} /> : null}
                                                title={update.stage}
                                            >
                                                <Text c="dimmed" size="xs">{new Date(update.timestamp).toLocaleString()}</Text>
                                                {update.notes && <Text size="sm" mt={4}>{update.notes}</Text>}
                                                {update.photoUrl && (
                                                    <Image
                                                        src={update.photoUrl}
                                                        alt="Update"
                                                        h={100}
                                                        w="auto"
                                                        radius="md"
                                                        mt="xs"
                                                        fallbackSrc="https://placehold.co/100x100?text=No+Preview"
                                                    />
                                                )}
                                            </Timeline.Item>
                                        ))}
                                    </Timeline>
                                </Box>
                            </>
                        )}

                        <Divider />

                        <Group justify="space-between" mt="md">
                            <Group gap="xs">
                                {selectedOrder.status === 'DRAFT' && (
                                    <Button variant="light" color="blue" leftSection={<IconEdit size={16} />} onClick={() => {
                                        closeDetails();
                                        handleEdit(selectedOrder);
                                    }}>
                                        Edit PO
                                    </Button>
                                )}
                                <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={async () => {
                                    if (window.confirm("Delete this PO?")) {
                                        await api.deleteOrder(selectedOrder.id);
                                        closeDetails();
                                        fetchData();
                                    }
                                }}>
                                    Delete PO
                                </Button>
                                {['APPROVED', 'SENT_TO_SUPPLIER', 'DELIVERED'].includes(selectedOrder.status) && (
                                    <Button variant="light" leftSection={<IconShip size={16} />} onClick={handleOpenTracking}>
                                        Record Tracking Update
                                    </Button>
                                )}
                            </Group>

                            <Group gap="xs">
                                {selectedOrder.status === 'DRAFT' && (
                                    <Button color="blue" onClick={() => handleOpenApprovalModal('APPROVED', 1)}>
                                        Submit for Level 1 Approval
                                    </Button>
                                )}
                                {selectedOrder.status === 'PENDING_APPROVAL' && (
                                    <>
                                        {approvalHistory.some(h => h.level === 1 && h.decision === 'APPROVED') ? (
                                            <Button color="indigo" onClick={() => handleOpenApprovalModal('APPROVED', 2)}>
                                                Approve (Level 2)
                                            </Button>
                                        ) : (
                                            <Button color="green" onClick={() => handleOpenApprovalModal('APPROVED', 1)}>
                                                Approve (Level 1)
                                            </Button>
                                        )}
                                        <Button color="red" variant="light" onClick={() => handleOpenApprovalModal('REJECTED', 1)}>
                                            Reject PO
                                        </Button>
                                    </>
                                )}
                                {selectedOrder.status === 'APPROVED' && (
                                    <Button color="indigo" onClick={() => api.updateOrder(selectedOrder.id, { status: 'SENT_TO_SUPPLIER' }).then(fetchData)}>
                                        Mark as Sent
                                    </Button>
                                )}
                            </Group>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Approval Decision Modal */}
            <Modal
                opened={approvalModalOpened}
                onClose={closeApproval}
                title={<Title order={4}>{approvalForm.values.decision} Purchase Order</Title>}
                radius="md"
            >
                <form onSubmit={approvalForm.onSubmit(onSubmitApproval)}>
                    <Stack>
                        <Select
                            label="Approver (Simulated Role-based)"
                            placeholder="Select approver"
                            data={users.map(u => ({ value: u.id, label: `${u.email} (${u.role})` }))}
                            withAsterisk
                            {...approvalForm.getInputProps('approverId')}
                        />
                        <TextInput
                            label="Remarks"
                            placeholder="Reason for approval/rejection"
                            {...approvalForm.getInputProps('remarks')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" color="gray" onClick={closeApproval}>Cancel</Button>
                            <Button
                                color={approvalForm.values.decision === 'REJECTED' ? 'red' : 'green'}
                                leftSection={approvalForm.values.decision === 'REJECTED' ? <IconX size={16} /> : <IconCheck size={16} />}
                                type="submit"
                            >
                                Confirm {approvalForm.values.decision}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
            {/* Tracking Update Modal */}
            <Modal
                opened={trackingModalOpened}
                onClose={closeTracking}
                title={<Title order={4}>Record Tracking Update</Title>}
                radius="md"
            >
                <form onSubmit={trackingForm.onSubmit(onSubmitTracking)}>
                    <Stack>
                        <Select
                            label="Current Stage"
                            placeholder="Select current stage"
                            data={[
                                'In Production',
                                'Quality Inspection',
                                'Ready to Ship',
                                'Shipped',
                                'In Transit',
                                'Port Clearance',
                                'Delivered'
                            ]}
                            withAsterisk
                            {...trackingForm.getInputProps('stage')}
                        />
                        <TextInput
                            label="Notes"
                            placeholder="Add details about the progress..."
                            leftSection={<IconMessageDots size={16} />}
                            {...trackingForm.getInputProps('notes')}
                        />
                        <TextInput
                            label="Photo URL"
                            placeholder="https://example.com/photo.jpg"
                            leftSection={<IconPhoto size={16} />}
                            {...trackingForm.getInputProps('photoUrl')}
                        />
                        <Checkbox
                            label="Update PO Status (e.g. set to SHIPPED if stage is Shipped)"
                            {...trackingForm.getInputProps('updatePOStatus', { type: 'checkbox' })}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" color="gray" onClick={closeTracking}>Cancel</Button>
                            <Button color="blue" type="submit">Save Update</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

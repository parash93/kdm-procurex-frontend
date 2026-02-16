import { Table, Button, Group, Title, Badge, ActionIcon, Modal, TextInput, Select, Paper, Stack, Text, Box, NumberInput } from "@mantine/core";
import { IconPlus, IconPencil, IconTrash, IconSearch, IconClock } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Products() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { isAdmin } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");

    const form = useForm({
        initialValues: {
            name: "",
            categoryId: "",
            description: "",
            minDeliveryDays: 0,
            status: "ACTIVE",
        },
        validate: {
            name: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
            categoryId: (value) => (!value ? 'Category is required' : null),
            minDeliveryDays: (value) => (value < 0 ? 'Cannot be negative' : null),
        },
    });

    const fetchData = async () => {
        try {
            const [productsData, categoriesData] = await Promise.all([
                api.getProducts(),
                api.getProductCategories()
            ]);
            setProducts(productsData || []);
            setCategories(categoriesData || []);
        } catch (error) {
            console.error("Error fetching products/categories:", error);
            setProducts([]);
            setCategories([]);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (values: typeof form.values) => {
        try {
            if (editingId) {
                await api.updateProduct(editingId, values);
            } else {
                await api.createProduct(values);
            }
            close();
            form.reset();
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving product:", error);
        }
    };

    const handleEdit = (product: any) => {
        if (!isAdmin) return;
        setEditingId(product.id);
        form.setValues({
            name: product.name,
            categoryId: product.categoryId.toString(),
            description: product.description || "",
            minDeliveryDays: product.minDeliveryDays || 0,
            status: product.status || "ACTIVE",
        });
        open();
    };

    const handleDelete = async (id: number) => {
        if (!isAdmin) return;
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await api.deleteProduct(id);
                fetchData();
            } catch (error) {
                console.error("Error deleting product:", error);
            }
        }
    };

    const handleAdd = () => {
        if (!isAdmin) return;
        setEditingId(null);
        form.reset();
        form.setFieldValue('status', 'ACTIVE');
        open();
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase()))
    );

    const rows = filteredProducts.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text fw={500}>{element.name}</Text>
                {element.description && (
                    <Text size="xs" c="dimmed" lineClamp={1}>{element.description}</Text>
                )}
            </Table.Td>
            <Table.Td>
                <Badge variant="dot" color="blue">{element.category?.name || 'Uncategorized'}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconClock size={14} color="gray" />
                    <Text size="sm">{element.minDeliveryDays} Days</Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge
                    variant="light"
                    color={element.status === 'ACTIVE' ? 'green' : element.status === 'BLACKLISTED' ? 'red' : 'yellow'}
                >
                    {element.status}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" justify="flex-end">
                    {isAdmin && (
                        <>
                            <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(element)}>
                                <IconPencil size={18} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(element.id)}>
                                <IconTrash size={18} />
                            </ActionIcon>
                        </>
                    )}
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end" wrap="wrap">
                    <Box>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Products</Title>
                        <Text c="dimmed" size="sm">Manage your product catalog and items</Text>
                    </Box>
                    <Button
                        leftSection={<IconPlus size={18} />}
                        onClick={handleAdd}
                        size="md"
                        radius="md"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan' }}
                        w={isMobile ? '100%' : 'auto'}
                    >
                        Add New Product
                    </Button>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <Group mb="lg">
                        <TextInput
                            placeholder="Search products by name or category..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            style={{ flex: 1 }}
                            radius="md"
                        />
                    </Group>

                    <Table.ScrollContainer minWidth={800}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Product Details</Table.Th>
                                    <Table.Th>Category</Table.Th>
                                    <Table.Th>Min. Delivery</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={5}>
                                            <Text ta="center" py="xl" c="dimmed">No products found</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>
            </Stack>

            <Modal
                opened={opened}
                onClose={close}
                title={
                    <Text fw={700} size="lg">
                        {editingId ? "Edit Product" : "Add New Product"}
                    </Text>
                }
                centered
                size="lg"
                fullScreen={isMobile}
                radius="md"
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <TextInput
                            label="Product Name"
                            placeholder="e.g. Ultra Charger 20W"
                            withAsterisk
                            radius="md"
                            {...form.getInputProps("name")}
                        />

                        <Select
                            label="Category"
                            placeholder="Select product category"
                            data={categories.map(c => ({ value: c.id + "", label: c.name }))}
                            withAsterisk
                            radius="md"
                            {...form.getInputProps("categoryId")}
                        />

                        <NumberInput
                            label="Minimum Delivery Time (Days)"
                            placeholder="Number of days"
                            min={0}
                            radius="md"
                            {...form.getInputProps("minDeliveryDays")}
                        />

                        <TextInput
                            label="Description"
                            placeholder="Product specifications or details"
                            radius="md"
                            {...form.getInputProps("description")}
                        />

                        <Select
                            label="Status"
                            placeholder="Select status"
                            data={[
                                { value: 'ACTIVE', label: 'Active' },
                                { value: 'SUSPENDED', label: 'Suspended' },
                                { value: 'BLACKLISTED', label: 'Blacklisted' }
                            ]}
                            radius="md"
                            {...form.getInputProps("status")}
                        />

                        <Group justify="flex-end" mt="xl">
                            <Button variant="subtle" color="gray" onClick={close} radius="md">
                                Cancel
                            </Button>
                            <Button type="submit" radius="md" px="xl" variant="filled">
                                {editingId ? "Save Changes" : "Create Product"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

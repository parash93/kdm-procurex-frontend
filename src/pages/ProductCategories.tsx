import { Table, Button, Group, Title, Badge, ActionIcon, Modal, TextInput, Select, Paper, Stack, Text, Box } from "@mantine/core";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { api } from "../api/client";
import { usePaginatedData } from "../hooks/usePaginatedData";
import { SearchBar, PaginationFooter } from "../components/PaginationControls";

export function ProductCategories() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const {
        data: categories, page, limit, totalPages, search,
        setSearch, setPage, setLimit, refetch, rangeText,
    } = usePaginatedData(
        (p, l, s, signal) => api.getProductCategoriesPaginated(p, l, s, signal)
    );

    const form = useForm({
        initialValues: {
            name: "",
            status: "ACTIVE",
        },
        validate: {
            name: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        try {
            if (editingId) {
                await api.updateProductCategory(Number(editingId), values);
            } else {
                await api.createProductCategory(values);
            }
            close();
            form.reset();
            setEditingId(null);
            refetch();
        } catch (error) {
            console.error("Error saving category:", error);
        }
    };

    const handleEdit = (category: any) => {
        setEditingId(category.id);
        form.setValues({
            name: category.name,
            status: category.status || "ACTIVE",
        });
        open();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await api.deleteProductCategory(Number(id));
                refetch();
            } catch (error) {
                console.error("Error deleting category:", error);
            }
        }
    };

    const handleAdd = () => {
        setEditingId(null);
        form.reset();
        form.setFieldValue('status', 'ACTIVE');
        open();
    };

    const rows = categories.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text fw={500}>{element.name}</Text>
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
                    <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(element)}>
                        <IconPencil size={18} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(element.id)}>
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end" wrap="wrap">
                    <Box>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Product Categories</Title>
                        <Text c="dimmed" size="sm">Manage categories for your product catalog</Text>
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
                        Add New Category
                    </Button>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <SearchBar
                        search={search}
                        onSearchChange={setSearch}
                        searchPlaceholder="Search categories by name..."
                        limit={limit}
                        onLimitChange={setLimit}
                    />

                    <Table.ScrollContainer minWidth={400}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Category Name</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={3}>
                                            <Text ta="center" py="xl" c="dimmed">No categories found</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    <PaginationFooter
                        totalPages={totalPages}
                        page={page}
                        onPageChange={setPage}
                        rangeText={rangeText}
                    />
                </Paper>
            </Stack>

            <Modal
                opened={opened}
                onClose={close}
                title={
                    <Text fw={700} size="lg">
                        {editingId ? "Edit Category" : "Add New Category"}
                    </Text>
                }
                centered
                size="md"
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
                            label="Category Name"
                            placeholder="e.g. Chargers, Cables, Screen Guards"
                            withAsterisk
                            radius="md"
                            {...form.getInputProps("name")}
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
                                {editingId ? "Save Changes" : "Create Category"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

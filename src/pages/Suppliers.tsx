import { Table, Button, Group, Title, Badge, ActionIcon, Modal, TextInput, Select, Paper, Stack, Text, Box } from "@mantine/core";
import { IconPlus, IconPencil, IconTrash, IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { api } from "../api/client";

export function Suppliers() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const form = useForm({
        initialValues: {
            companyName: "",
            contactPerson: "",
            email: "",
            phone: "",
            address: "",
            status: "ACTIVE",
        },
        validate: {
            companyName: (value) => (value.length < 2 ? 'Company name must have at least 2 letters' : null),
            email: (value) => (value && !/^\S+@\S+$/.test(value) ? 'Invalid email' : null),
        },
    });

    const fetchSuppliers = () => {
        api.getSuppliers()
            .then(setSuppliers)
            .catch(console.error);
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSubmit = async (values: typeof form.values) => {
        try {
            if (editingId) {
                await api.updateSupplier(Number(editingId), values);
            } else {
                await api.createSupplier(values);
            }
            close();
            form.reset();
            setEditingId(null);
            fetchSuppliers();
        } catch (error) {
            console.error("Error saving supplier:", error);
        }
    };

    const handleEdit = (supplier: any) => {
        setEditingId(supplier.id);
        form.setValues({
            companyName: supplier.companyName,
            contactPerson: supplier.contactPerson || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            status: supplier.status || "ACTIVE",
        });
        open();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this supplier?")) {
            try {
                await api.deleteSupplier(Number(id));
                fetchSuppliers();
            } catch (error) {
                console.error("Error deleting supplier:", error);
            }
        }
    };

    const handleAdd = () => {
        setEditingId(null);
        form.reset();
        form.setFieldValue('status', 'ACTIVE');
        open();
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.companyName.toLowerCase().includes(search.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()))
    );

    const rows = filteredSuppliers.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text fw={500}>{element.companyName}</Text>
            </Table.Td>
            <Table.Td>{element.contactPerson || '-'}</Table.Td>
            <Table.Td>{element.email || '-'}</Table.Td>
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
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Suppliers</Title>
                        <Text c="dimmed" size="sm">Manage your vendor relationships and master data</Text>
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
                        Add New Supplier
                    </Button>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <Group mb="lg">
                        <TextInput
                            placeholder="Search suppliers by name or contact..."
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
                                    <Table.Th>Company Name</Table.Th>
                                    <Table.Th>Contact Person</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={5}>
                                            <Text ta="center" py="xl" c="dimmed">No suppliers found</Text>
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
                        {editingId ? "Edit Supplier" : "Add New Supplier"}
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
                            label="Company Name"
                            placeholder="e.g. Acme Corporation"
                            withAsterisk
                            radius="md"
                            {...form.getInputProps("companyName")}
                        />
                        <Stack gap="md">
                            <TextInput
                                label="Contact Person"
                                placeholder="Full name"
                                radius="md"
                                {...form.getInputProps("contactPerson")}
                            />
                            <TextInput
                                label="Email Address"
                                placeholder="email@example.com"
                                radius="md"
                                {...form.getInputProps("email")}
                            />
                        </Stack>
                        <TextInput
                            label="Phone Number"
                            placeholder="+1234567890"
                            radius="md"
                            {...form.getInputProps("phone")}
                        />
                        <TextInput
                            label="Physical Address"
                            placeholder="Complete address"
                            radius="md"
                            {...form.getInputProps("address")}
                        />

                        {editingId && (
                            <Select
                                label="Verification Status"
                                placeholder="Select status"
                                data={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'SUSPENDED', label: 'Suspended' },
                                    { value: 'BLACKLISTED', label: 'Blacklisted' }
                                ]}
                                radius="md"
                                {...form.getInputProps("status")}
                            />
                        )}

                        <Group justify="flex-end" mt="xl">
                            <Button variant="subtle" color="gray" onClick={close} radius="md">
                                Cancel
                            </Button>
                            <Button type="submit" radius="md" px="xl" variant="filled">
                                {editingId ? "Save Changes" : "Create Supplier"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

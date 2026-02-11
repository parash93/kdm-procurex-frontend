import { Table, Button, Group, Title, Badge, ActionIcon, Modal, TextInput, Select, Paper, Stack, Text, Box } from "@mantine/core";
import { IconPlus, IconPencil, IconTrash, IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { api } from "../api/client";

export function Divisions() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [divisions, setDivisions] = useState<any[]>([]);
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const form = useForm({
        initialValues: {
            name: "",
            contactPerson: "",
            status: "ACTIVE",
        },
        validate: {
            name: (value) => (value.length < 2 ? 'Name must have at least 2 letters' : null),
        },
    });

    const fetchDivisions = () => {
        api.getDivisions()
            .then(setDivisions)
            .catch(console.error);
    };

    useEffect(() => {
        fetchDivisions();
    }, []);

    const handleSubmit = async (values: typeof form.values) => {
        try {
            if (editingId) {
                await api.updateDivision(editingId, values);
            } else {
                await api.createDivision(values);
            }
            close();
            form.reset();
            setEditingId(null);
            fetchDivisions();
        } catch (error) {
            console.error("Error saving division:", error);
        }
    };

    const handleEdit = (division: any) => {
        setEditingId(division.id);
        form.setValues({
            name: division.name,
            contactPerson: division.contactPerson || "",
            status: division.status || "ACTIVE",
        });
        open();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this division?")) {
            try {
                await api.deleteDivision(id);
                fetchDivisions();
            } catch (error) {
                console.error("Error deleting division:", error);
            }
        }
    };

    const handleAdd = () => {
        setEditingId(null);
        form.reset();
        form.setFieldValue('status', 'ACTIVE');
        open();
    };

    const filteredDivisions = divisions.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.contactPerson && d.contactPerson.toLowerCase().includes(search.toLowerCase()))
    );

    const rows = filteredDivisions.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>
                <Text fw={500}>{element.name}</Text>
            </Table.Td>
            <Table.Td>{element.contactPerson || '-'}</Table.Td>
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
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>Divisions</Title>
                        <Text c="dimmed" size="sm">Manage company divisions and departments</Text>
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
                        Add New Division
                    </Button>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ backgroundColor: 'var(--mantine-color-body)' }}>
                    <Group mb="lg">
                        <TextInput
                            placeholder="Search divisions by name..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            style={{ flex: 1 }}
                            radius="md"
                        />
                    </Group>

                    <Table.ScrollContainer minWidth={600}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Division Name</Table.Th>
                                    <Table.Th>Contact Person</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? rows : (
                                    <Table.Tr>
                                        <Table.Td colSpan={4}>
                                            <Text ta="center" py="xl" c="dimmed">No divisions found</Text>
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
                        {editingId ? "Edit Division" : "Add New Division"}
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
                            label="Division Name"
                            placeholder="e.g. Sales, Operations"
                            withAsterisk
                            radius="md"
                            {...form.getInputProps("name")}
                        />
                        <TextInput
                            label="Contact Person"
                            placeholder="Name of the person in charge"
                            radius="md"
                            {...form.getInputProps("contactPerson")}
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
                                {editingId ? "Save Changes" : "Create Division"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

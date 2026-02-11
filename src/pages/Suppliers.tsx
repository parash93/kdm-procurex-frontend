import { Table, Button, Group, Title, Badge, ActionIcon, Modal, TextInput, Select } from "@mantine/core";
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { api } from "../api/client";

export function Suppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [opened, { open, close }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            companyName: "",
            contactPerson: "",
            email: "",
            phone: "",
            address: "",
            status: "ACTIVE", // Default status
        },
        validate: {
            companyName: (value) => (value.length < 2 ? 'Company name must have at least 2 letters' : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
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
                await api.updateSupplier(editingId, values);
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
                await api.deleteSupplier(id);
                fetchSuppliers();
            } catch (error) {
                console.error("Error deleting supplier:", error);
            }
        }
    };

    const handleAdd = () => {
        setEditingId(null);
        form.reset();
        open();
    };

    const rows = suppliers.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>{element.companyName}</Table.Td>
            <Table.Td>{element.contactPerson}</Table.Td>
            <Table.Td>{element.email}</Table.Td>
            <Table.Td>
                <Badge color={element.status === 'ACTIVE' ? 'green' : element.status === 'BLACKLISTED' ? 'red' : 'yellow'}>{element.status}</Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={0} justify="flex-end">
                    <ActionIcon variant="subtle" color="gray" onClick={() => handleEdit(element)}>
                        <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(element.id)}>
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Suppliers</Title>
                <Button leftSection={<IconPlus size={14} />} onClick={handleAdd}>Add Supplier</Button>
            </Group>

            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Company Name</Table.Th>
                        <Table.Th>Contact Person</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
            </Table>

            <Modal opened={opened} onClose={close} title={editingId ? "Edit Supplier" : "Add Supplier"}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Company Name"
                        placeholder="Tech Corp"
                        withAsterisk
                        mb="md"
                        {...form.getInputProps("companyName")}
                    />
                    <TextInput
                        label="Contact Person"
                        placeholder="John Doe"
                        mb="md"
                        {...form.getInputProps("contactPerson")}
                    />
                    <TextInput
                        label="Email"
                        placeholder="john@example.com"
                        mb="md"
                        {...form.getInputProps("email")}
                    />
                    <TextInput
                        label="Phone"
                        placeholder="+1234567890"
                        mb="md"
                        {...form.getInputProps("phone")}
                    />
                    <TextInput
                        label="Address"
                        placeholder="123 Main St"
                        mb="md"
                        {...form.getInputProps("address")}
                    />

                    {editingId && (
                        <Select
                            label="Status"
                            placeholder="Select status"
                            data={['ACTIVE', 'SUSPENDED', 'BLACKLISTED']}
                            mb="md"
                            {...form.getInputProps("status")}
                        />
                    )}

                    <Group justify="flex-end" mt="lg">
                        <Button variant="default" onClick={close}>Cancel</Button>
                        <Button type="submit">{editingId ? "Update" : "Create"}</Button>
                    </Group>
                </form>
            </Modal>
        </>
    );
}

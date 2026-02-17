import { useEffect, useState } from 'react';
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
    LoadingOverlay,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
    IconPlus,
    IconTrash,
    IconMail,
    IconShieldLock,
    IconSearch,
    IconDownload,
} from '@tabler/icons-react';
import { downloadCSV } from "../utils/export";
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [opened, { open, close }] = useDisclosure(false);

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
            role: 'OPERATIONS',
        },
        validate: {
            username: (value) => (value.length >= 3 ? null : 'Username must be at least 3 characters'),
            password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
        },
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getAuthUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (values: typeof form.values) => {
        setSubmitting(true);
        try {
            await api.registerUser(values);
            close();
            form.reset();
            fetchUsers();
            notifications.show({
                title: 'User Created',
                message: `${values.username} has been registered successfully.`,
                color: 'green'
            });
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to create user',
                color: 'red'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: number, username: string) => {
        if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
            try {
                await api.deleteAuthUser(Number(id));
                fetchUsers();
                notifications.show({
                    title: 'User Deleted',
                    message: 'User has been removed from the system.',
                    color: 'blue'
                });
            } catch (error: any) {
                notifications.show({
                    title: 'Error',
                    message: error.response?.data?.message || 'Failed to delete user',
                    color: 'red'
                });
            }
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase())
    );

    const roleColors: Record<string, string> = {
        ADMIN: 'red',
        SALES_MANAGER: 'blue',
        // FINANCE: 'teal',
        OPERATIONS: 'gray'
    };

    const handleExport = () => {
        const dataToExport = filteredUsers.map((u: any) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            createdAt: u.createdAt,
        }));
        downloadCSV(dataToExport, "users");
    };

    const rows = filteredUsers.map((user) => (
        <Table.Tr key={user.id}>
            <Table.Td>
                <Text size="sm" c="dimmed">#{user.id}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="sm">
                    <Box style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: 'var(--mantine-color-blue-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Text fw={700} c="blue">{user.username[0].toUpperCase()}</Text>
                    </Box>
                    <Box>
                        <Text size="sm" fw={500}>{user.username}</Text>
                        <Text size="xs" c="dimmed">ID: {user.id}</Text>
                    </Box>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge color={roleColors[user.role]} variant="light" radius="sm">
                    {user.role}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Text size="xs" c="dimmed">
                    {new Date(user.createdAt).toLocaleString()}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap={0} justify="flex-end">
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={user.role === 'ADMIN' && users.filter(u => u.role === 'ADMIN').length === 1}
                    >
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end">
                    <Box>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1px' }}>User Management</Title>
                        <Text c="dimmed" size="sm">Manage roles and permissions for system users.</Text>
                    </Box>
                    <Group>
                        <TextInput
                            placeholder="Search users..."
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                        />
                        <Button
                            leftSection={<IconPlus size={18} />}
                            onClick={open}
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'indigo' }}
                        >
                            Add New User
                        </Button>
                        <Button
                            leftSection={<IconDownload size={18} />}
                            onClick={handleExport}
                            variant="outline"
                            color="gray"
                            style={{ marginLeft: 8 }}
                        >
                            Export CSV
                        </Button>
                    </Group>
                </Group>

                <Paper p="md" radius="md" withBorder shadow="sm" style={{ position: 'relative' }}>
                    <LoadingOverlay visible={loading} overlayProps={{ blur: 1 }} />
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>ID</Table.Th>
                                <Table.Th>User Details</Table.Th>
                                <Table.Th>Role</Table.Th>
                                <Table.Th>Created Date</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {rows.length > 0 ? rows : (
                                <Table.Tr><Table.Td colSpan={5} ta="center">No users found</Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Stack>

            <Modal
                opened={opened}
                onClose={close}
                title={<Title order={3} fw={900}>Register New User</Title>}
                radius="lg"
                padding="xl"
            >
                <form onSubmit={form.onSubmit(handleCreateUser)}>
                    <Stack gap="md">
                        <TextInput
                            label="Username"
                            placeholder="e.g. john_doe"
                            leftSection={<IconMail size={16} />}
                            required
                            {...form.getInputProps('username')}
                        />
                        <TextInput
                            label="Initial Password"
                            placeholder="Secure password"
                            type="password"
                            leftSection={<IconShieldLock size={16} />}
                            required
                            {...form.getInputProps('password')}
                        />
                        <Select
                            label="Role"
                            placeholder="Select user role"
                            data={[
                                { value: 'ADMIN', label: 'Administrator' },
                                // { value: 'PURCHASE_MANAGER', label: 'Purchase Manager' },
                                // { value: 'FINANCE', label: 'Finance Officer' },
                                { value: 'OPERATIONS', label: 'Operations' },
                                { value: 'SALES_MANAGER', label: 'Sales Manager' },

                            ]}
                            required
                            {...form.getInputProps('role')}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            mt="xl"
                            radius="md"
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'indigo' }}
                            loading={submitting}
                        >
                            Create Account
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}

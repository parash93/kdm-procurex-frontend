import { AppShell, Burger, Group, NavLink, Text, Stack, ActionIcon, Avatar, Menu, Box, Divider, Badge } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    IconDashboard,
    IconTruck,
    IconShoppingCart,
    IconBuildingSkyscraper,
    IconCategory,
    IconPackage,
    IconUsers,
    IconLogout,
    IconChevronRight
} from "@tabler/icons-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
    const [opened, { toggle }] = useDisclosure();
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const links = [
        { icon: IconDashboard, label: 'Dashboard', to: '/dashboard' },
        { icon: IconTruck, label: 'Suppliers', to: '/suppliers' },
        { icon: IconBuildingSkyscraper, label: 'Divisions', to: '/divisions' },
        { icon: IconCategory, label: 'Product Categories', to: '/product-categories' },
        { icon: IconPackage, label: 'Products', to: '/products' },
        { icon: IconShoppingCart, label: 'Orders', to: '/orders' },
    ];

    if (isAdmin) {
        links.push({ icon: IconUsers, label: 'Users', to: '/users' });
    }

    const items = links.map((link) => (
        <NavLink
            key={link.label}
            active={location.pathname === link.to}
            label={link.label}
            leftSection={<link.icon size="1.2rem" stroke={1.5} />}
            rightSection={<IconChevronRight size="0.8rem" stroke={1.5} />}
            onClick={() => navigate(link.to)}
            variant="light"
            styles={{
                label: { fontWeight: 500 }
            }}
        />
    ));

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{
                width: 280,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding={{ base: 'md', sm: 'xl' }}
            bg="var(--mantine-color-body)"
        >
            <AppShell.Header style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Group h="100%" px="xl" justify="space-between">
                    <Group gap="xs">
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Text
                            fw={800}
                            size="xl"
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                            style={{ letterSpacing: '-0.5px' }}
                        >
                            KDM ProcureX
                        </Text>
                    </Group>

                    <Group gap="md">
                        <Box hiddenFrom="xs">
                            <Text size="sm" fw={600}>{user?.email}</Text>
                            <Badge size="xs" variant="light">{user?.role}</Badge>
                        </Box>
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="light" size="lg" radius="md">
                                    <Avatar size="sm" color="blue" radius="md">{user?.email[0].toUpperCase()}</Avatar>
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Account</Menu.Label>
                                <Menu.Item disabled leftSection={<IconUsers size={14} />}>
                                    Profile Settings
                                </Menu.Item>
                                <Divider />
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconLogout size={14} />}
                                    onClick={() => {
                                        logout();
                                        navigate('/login');
                                    }}
                                >
                                    Log Out
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Stack gap="xs" style={{ height: '100%' }}>
                    <Box style={{ flex: 1 }}>
                        <Stack gap="xs">
                            {items}
                        </Stack>
                    </Box>

                    <Box pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                        <Group gap="sm" p="xs">
                            <Avatar color="blue" radius="xl">{user?.email[0].toUpperCase()}</Avatar>
                            <Box style={{ flex: 1 }}>
                                <Text size="xs" fw={700} style={{ maxWidth: 150 }} truncate="end">{user?.email}</Text>
                                <Text size="calc(0.6rem)" c="dimmed" fw={500}>{user?.role}</Text>
                            </Box>
                            <ActionIcon variant="subtle" color="gray" onClick={logout}>
                                <IconLogout size={16} />
                            </ActionIcon>
                        </Group>
                    </Box>
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}

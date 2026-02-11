import { AppShell, Burger, Group, NavLink, Text, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDashboard, IconTruck, IconShoppingCart, IconBuildingSkyscraper, IconCategory, IconPackage } from "@tabler/icons-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export function Layout() {
    const [opened, { toggle }] = useDisclosure();
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

    const items = links.map((link) => (
        <NavLink
            key={link.label}
            active={location.pathname === link.to}
            label={link.label}
            leftSection={<link.icon size="1.2rem" stroke={1.5} />}
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
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Stack gap="xs">
                    {items}
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}

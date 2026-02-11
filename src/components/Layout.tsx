import { AppShell, Burger, Group, NavLink, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDashboard, IconTruck, IconShoppingCart } from "@tabler/icons-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export function Layout() {
    const [opened, { toggle }] = useDisclosure();
    const navigate = useNavigate();
    const location = useLocation();

    const links = [
        { icon: IconDashboard, label: 'Dashboard', to: '/dashboard' },
        { icon: IconTruck, label: 'Suppliers', to: '/suppliers' },
        { icon: IconShoppingCart, label: 'Orders', to: '/orders' },
    ];

    const items = links.map((link) => (
        <NavLink
            key={link.label}
            active={location.pathname === link.to}
            label={link.label}
            leftSection={<link.icon size="1rem" stroke={1.5} />}
            onClick={() => navigate(link.to)}
            variant="filled"
        />
    ));

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Text fw={700} size="xl">KDM ProcureX</Text>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                {items}
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}

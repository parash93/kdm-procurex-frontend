import { SimpleGrid, Card, Text } from "@mantine/core";

export function Dashboard() {
    return (
        <>
            <Text size="xl" fw={700} mb="lg">Dashboard</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Card shadow="sm" padding="lg">
                    <Text fw={500}>Active Orders</Text>
                    <Text size="xl" fw={700}>12</Text>
                </Card>
                <Card shadow="sm" padding="lg">
                    <Text fw={500}>Pending Approvals</Text>
                    <Text size="xl" fw={700} c="orange">4</Text>
                </Card>
                <Card shadow="sm" padding="lg">
                    <Text fw={500}>Total Suppliers</Text>
                    <Text size="xl" fw={700}>25</Text>
                </Card>
            </SimpleGrid>
        </>
    );
}

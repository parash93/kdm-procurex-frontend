import { Table, Button, Group, Title, Badge } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";

export function Orders() {
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        api.getOrders()
            .then(setOrders)
            .catch(console.error);
    }, []);

    const rows = orders.map((element: any) => (
        <Table.Tr key={element.id}>
            <Table.Td>{element.poNumber}</Table.Td>
            <Table.Td>{element.supplier?.companyName}</Table.Td>
            <Table.Td>{new Date(element.poDate).toLocaleDateString()}</Table.Td>
            <Table.Td>
                <Badge>{element.status}</Badge>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Purchase Orders</Title>
                <Button leftSection={<IconPlus size={14} />}>Create Order</Button>
            </Group>

            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>PO Number</Table.Th>
                        <Table.Th>Supplier</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Status</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
            </Table>
        </>
    );
}

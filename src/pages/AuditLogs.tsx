import {
    Table, Group, Title, Badge, Paper, Stack, Text, Box,
    Select, Tooltip, Code, Modal, ScrollArea, JsonInput,
} from "@mantine/core";
import { IconHistory, IconEye } from "@tabler/icons-react";
import { useState } from "react";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { api } from "../api/client";
import { usePaginatedData } from "../hooks/usePaginatedData";
import { SearchBar, PaginationFooter } from "../components/PaginationControls";

const ACTION_COLORS: Record<string, string> = {
    CREATE: "green",
    UPDATE: "blue",
    DELETE: "red",
    APPROVE: "teal",
    REJECT: "orange",
    STATUS_CHANGE: "violet",
    SUBMIT: "cyan",
    STAGE_UPDATE: "indigo",
    LOGIN: "gray",
    STOCK_UPDATE: "yellow",
};

const ENTITY_COLORS: Record<string, string> = {
    ORDER: "blue",
    SUPPLIER: "green",
    PRODUCT: "violet",
    PRODUCT_CATEGORY: "cyan",
    DIVISION: "orange",
    USER: "pink",
    INVENTORY: "yellow",
};

const ENTITY_TYPES = [
    { value: "", label: "All Entities" },
    { value: "ORDER", label: "Orders" },
    { value: "SUPPLIER", label: "Suppliers" },
    { value: "PRODUCT", label: "Products" },
    { value: "PRODUCT_CATEGORY", label: "Product Categories" },
    { value: "DIVISION", label: "Divisions" },
    { value: "USER", label: "Users" },
    { value: "INVENTORY", label: "Inventory" },
];

const ACTION_TYPES = [
    { value: "", label: "All Actions" },
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "APPROVE", label: "Approve" },
    { value: "REJECT", label: "Reject" },
    { value: "STATUS_CHANGE", label: "Status Change" },
    { value: "SUBMIT", label: "Submit" },
    { value: "STAGE_UPDATE", label: "Stage Update" },
    { value: "LOGIN", label: "Login" },
    { value: "STOCK_UPDATE", label: "Stock Update" },
];

function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
}

function formatTimeAgo(dateStr: string) {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return "just now";
}

export function AuditLogs() {
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [filterEntityType, setFilterEntityType] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const {
        data: logs,
        page,
        limit,
        totalPages,
        search,
        setSearch,
        setPage,
        setLimit,
        rangeText,
    } = usePaginatedData(
        (p, l, s, signal) =>
            api.getAuditLogsPaginated(
                p,
                l,
                s,
                filterEntityType || undefined,
                filterAction || undefined,
                undefined,
                signal
            ),
        { extraDeps: [filterEntityType, filterAction] }
    );

    const handleViewDetail = (log: any) => {
        setSelectedLog(log);
        openDetail();
    };

    const rows = logs.map((log: any) => (
        <Table.Tr key={log.id}>
            <Table.Td>
                <Text size="xs" c="dimmed" ff="monospace">
                    {log.id}
                </Text>
            </Table.Td>
            <Table.Td>
                <Tooltip label={formatDateTime(log.createdAt)} withArrow>
                    <Text size="sm">{formatTimeAgo(log.createdAt)}</Text>
                </Tooltip>
            </Table.Td>
            <Table.Td>
                <Text size="sm" fw={500}>
                    {log.username || "SYSTEM"}
                </Text>
            </Table.Td>
            <Table.Td>
                <Badge
                    variant="light"
                    color={ACTION_COLORS[log.action] || "gray"}
                    size="sm"
                    radius="sm"
                >
                    {log.action}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={6}>
                    <Badge
                        variant="dot"
                        color={ENTITY_COLORS[log.entityType] || "gray"}
                        size="sm"
                    >
                        {log.entityType}
                    </Badge>
                    <Code>{`#${log.entityId}`}</Code>
                </Group>
            </Table.Td>
            <Table.Td>
                {log.metadata && typeof log.metadata === "object" ? (
                    <Text size="xs" c="dimmed" lineClamp={1}>
                        {log.metadata.poNumber && `PO: ${log.metadata.poNumber}`}
                        {log.metadata.decision && ` | ${log.metadata.decision}`}
                        {log.metadata.stage && `Stage: ${log.metadata.stage}`}
                        {log.metadata.type && `${log.metadata.type}: ${log.metadata.quantityChanged}`}
                        {log.metadata.previousStatus &&
                            log.metadata.newStatus &&
                            log.metadata.previousStatus !== log.metadata.newStatus &&
                            `${log.metadata.previousStatus} → ${log.metadata.newStatus}`}
                    </Text>
                ) : (
                    <Text size="xs" c="dimmed">—</Text>
                )}
            </Table.Td>
            <Table.Td>
                <Tooltip label="View Details" withArrow>
                    <Badge
                        variant="light"
                        color="blue"
                        size="lg"
                        radius="sm"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleViewDetail(log)}
                        leftSection={<IconEye size={14} />}
                    >
                        View
                    </Badge>
                </Tooltip>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box pb="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end" wrap="wrap">
                    <Box>
                        <Group gap="sm" align="center">
                            <IconHistory size={28} style={{ color: "var(--mantine-color-violet-5)" }} />
                            <Title order={1} fw={900} style={{ letterSpacing: "-1px" }}>
                                Audit Logs
                            </Title>
                        </Group>
                        <Text c="dimmed" size="sm">
                            Track every action — who did what, when, and on which entity
                        </Text>
                    </Box>
                </Group>

                <Paper
                    p="md"
                    radius="md"
                    withBorder
                    shadow="sm"
                    style={{ backgroundColor: "var(--mantine-color-body)" }}
                >
                    <Stack gap="md">
                        <SearchBar
                            search={search}
                            onSearchChange={setSearch}
                            searchPlaceholder="Search by username, entity type, or action..."
                            limit={limit}
                            onLimitChange={setLimit}
                        />

                        <Group gap="sm" wrap="wrap">
                            <Select
                                placeholder="Filter by entity"
                                data={ENTITY_TYPES}
                                value={filterEntityType}
                                onChange={(v) => {
                                    setFilterEntityType(v || "");
                                    setPage(1);
                                }}
                                clearable
                                size="sm"
                                radius="md"
                                w={isMobile ? "100%" : 200}
                            />
                            <Select
                                placeholder="Filter by action"
                                data={ACTION_TYPES}
                                value={filterAction}
                                onChange={(v) => {
                                    setFilterAction(v || "");
                                    setPage(1);
                                }}
                                clearable
                                size="sm"
                                radius="md"
                                w={isMobile ? "100%" : 200}
                            />
                        </Group>
                    </Stack>

                    <Table.ScrollContainer minWidth={900} mt="md">
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th w={60}>ID</Table.Th>
                                    <Table.Th w={100}>When</Table.Th>
                                    <Table.Th w={120}>User</Table.Th>
                                    <Table.Th w={130}>Action</Table.Th>
                                    <Table.Th w={200}>Entity</Table.Th>
                                    <Table.Th>Details</Table.Th>
                                    <Table.Th w={80} style={{ textAlign: "right" }}>

                                    </Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.length > 0 ? (
                                    rows
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={7}>
                                            <Text ta="center" py="xl" c="dimmed">
                                                No audit logs found
                                            </Text>
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

            {/* Detail Modal */}
            <Modal
                opened={detailOpened}
                onClose={closeDetail}
                title={
                    <Group gap="sm">
                        <IconHistory size={20} />
                        <Text fw={700} size="lg">
                            Audit Log Detail
                        </Text>
                    </Group>
                }
                centered
                size="xl"
                fullScreen={isMobile}
                radius="md"
                padding="xl"
                overlayProps={{
                    backgroundOpacity: 0.55,
                    blur: 3,
                }}
            >
                {selectedLog && (
                    <ScrollArea>
                        <Stack gap="md">
                            <Group gap="xl" wrap="wrap">
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                        Action
                                    </Text>
                                    <Badge
                                        variant="light"
                                        color={ACTION_COLORS[selectedLog.action] || "gray"}
                                        size="lg"
                                        mt={4}
                                    >
                                        {selectedLog.action}
                                    </Badge>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                        Entity
                                    </Text>
                                    <Group gap={6} mt={4}>
                                        <Badge
                                            variant="dot"
                                            color={ENTITY_COLORS[selectedLog.entityType] || "gray"}
                                        >
                                            {selectedLog.entityType}
                                        </Badge>
                                        <Code>{`#${selectedLog.entityId}`}</Code>
                                    </Group>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                        Performed By
                                    </Text>
                                    <Text fw={500} size="sm" mt={4}>
                                        {selectedLog.username || "SYSTEM"}
                                        {selectedLog.userId && (
                                            <Text span c="dimmed" size="xs">
                                                {" "}(ID: {selectedLog.userId})
                                            </Text>
                                        )}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                        Timestamp
                                    </Text>
                                    <Text size="sm" mt={4}>
                                        {formatDateTime(selectedLog.createdAt)}
                                    </Text>
                                </Box>
                            </Group>

                            {selectedLog.metadata && selectedLog.metadata !== null && (
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                                        Metadata
                                    </Text>
                                    <JsonInput
                                        value={JSON.stringify(selectedLog.metadata, null, 2)}
                                        readOnly
                                        autosize
                                        minRows={2}
                                        maxRows={8}
                                        radius="md"
                                    />
                                </Box>
                            )}

                            {selectedLog.previousData && selectedLog.previousData !== null && (
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                                        Previous State
                                    </Text>
                                    <JsonInput
                                        value={JSON.stringify(selectedLog.previousData, null, 2)}
                                        readOnly
                                        autosize
                                        minRows={3}
                                        maxRows={12}
                                        radius="md"
                                        styles={{
                                            input: {
                                                backgroundColor: "var(--mantine-color-red-light)",
                                                fontFamily: "monospace",
                                                fontSize: "12px",
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {selectedLog.newData && selectedLog.newData !== null && (
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                                        New State
                                    </Text>
                                    <JsonInput
                                        value={JSON.stringify(selectedLog.newData, null, 2)}
                                        readOnly
                                        autosize
                                        minRows={3}
                                        maxRows={12}
                                        radius="md"
                                        styles={{
                                            input: {
                                                backgroundColor: "var(--mantine-color-green-light)",
                                                fontFamily: "monospace",
                                                fontSize: "12px",
                                            },
                                        }}
                                    />
                                </Box>
                            )}
                        </Stack>
                    </ScrollArea>
                )}
            </Modal>
        </Box>
    );
}

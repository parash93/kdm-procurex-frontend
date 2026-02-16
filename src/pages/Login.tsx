import { useState } from 'react';
import {
    TextInput,
    PasswordInput,
    Paper,
    Title,
    Text,
    Container,
    Button,
    Box,
    Stack,
    Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { IconLock, IconMail, IconAlertCircle } from '@tabler/icons-react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            username: '',
            password: '',
        },
        validate: {
            username: (value) => (value.length > 0 ? null : 'Username is required'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        setError(null);
        try {
            await login(values.username, values.password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <Container size={420} my={40}>
                <Stack gap="xs" align="center" mb={30}>
                    <Box style={{
                        width: 60,
                        height: 60,
                        borderRadius: 16,
                        background: 'linear-gradient(45deg, #4dabf7, #339af0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(51, 154, 240, 0.3)'
                    }}>
                        <IconLock color="white" size={32} />
                    </Box>
                    <Title order={1} fw={900} c="white" style={{ letterSpacing: '-1px' }}>KDM ProcureX</Title>
                    <Text c="dimmed" size="sm" ta="center">Welcome back! Please enter your details.</Text>
                </Stack>

                <Paper withBorder shadow="xl" p={30} radius="lg" style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            {error && (
                                <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" radius="md">
                                    {error}
                                </Alert>
                            )}

                            <TextInput
                                label={<Text c="gray.3" size="sm" fw={500}>Username</Text>}
                                placeholder="e.g. admin"
                                required
                                size="md"
                                radius="md"
                                leftSection={<IconMail size={16} />}
                                styles={{
                                    input: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        borderColor: 'rgba(255, 255, 255, 0.2)'
                                    }
                                }}
                                {...form.getInputProps('username')}
                            />
                            <PasswordInput
                                label={<Text c="gray.3" size="sm" fw={500}>Password</Text>}
                                placeholder="Your password"
                                required
                                size="md"
                                radius="md"
                                leftSection={<IconLock size={16} />}
                                styles={{
                                    input: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        borderColor: 'rgba(255, 255, 255, 0.2)'
                                    },
                                    innerInput: { color: 'white' }
                                }}
                                {...form.getInputProps('password')}
                            />

                            {/* <Group justify="space-between" mt="xs">
                                <Checkbox
                                    label="Remember me"
                                    styles={{ label: { color: '#adb5bd' } }}
                                />
                                <Anchor component="button" size="sm" color="blue">
                                    Forgot password?
                                </Anchor>
                            </Group> */}

                            <Button
                                type="submit"
                                fullWidth
                                mt="xl"
                                size="lg"
                                radius="md"
                                loading={loading}
                                variant="gradient"
                                gradient={{ from: 'blue', to: 'indigo' }}
                                style={{ boxShadow: '0 4px 12px rgba(51, 154, 240, 0.3)' }}
                            >
                                Sign In
                            </Button>
                        </Stack>
                    </form>
                </Paper>

                <Text c="dimmed" size="xs" ta="center" mt={30} style={{ opacity: 0.6 }}>
                    &copy; 2026 KDM ProcureX. All rights reserved.
                </Text>
            </Container>
        </Box>
    );
}

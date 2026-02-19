import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
});

// ─── Token helpers ───────────────────────────────────────────────────────────

function getToken() {
    return localStorage.getItem('procurex_token');
}

function getExpiresAt() {
    const v = localStorage.getItem('procurex_token_expires_at');
    return v ? parseInt(v, 10) : null;
}

function saveToken(token: string, expiresAt: number) {
    localStorage.setItem('procurex_token', token);
    localStorage.setItem('procurex_token_expires_at', String(expiresAt));
}

function clearAuth() {
    localStorage.removeItem('procurex_token');
    localStorage.removeItem('procurex_token_expires_at');
    localStorage.removeItem('procurex_user');
}

// ─── Proactive refresh (sliding session) ─────────────────────────────────────
// If the token has less than 25% of its lifetime left, refresh it before the request.
const TOKEN_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const REFRESH_THRESHOLD = 0.25; // refresh when < 25% lifetime remains
let isRefreshing = false; // prevent parallel refresh calls

async function maybeRefreshToken(): Promise<void> {
    if (isRefreshing) return;
    const token = getToken();
    const expiresAt = getExpiresAt();
    if (!token || !expiresAt) return;

    const remaining = expiresAt - Date.now();
    if (remaining > TOKEN_TTL_MS * REFRESH_THRESHOLD) return; // plenty of time left

    try {
        isRefreshing = true;
        const response = await axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const { token: newToken, expiresAt: newExpiry } = response.data;
        saveToken(newToken, newExpiry);
    } catch {
        // If refresh fails the existing token is still good until it truly expires
    } finally {
        isRefreshing = false;
    }
}

// ─── Request interceptor: attach token + maybe refresh ───────────────────────
apiClient.interceptors.request.use(async (config) => {
    // Don't attempt to refresh when calling the refresh or login endpoints themselves
    const isAuthEndpoint = config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login');
    if (!isAuthEndpoint) {
        await maybeRefreshToken();
    }

    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Response interceptor: auto-logout on 401 ────────────────────────────────
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearAuth();
            // Notify the app to redirect to login
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export const api = {
    // Auth
    login: async (params: any) => {
        const response = await apiClient.post('/auth/login', params);
        // Persist the expiry so the proactive refresh logic can check it
        if (response.data?.expiresAt) {
            saveToken(response.data.token, response.data.expiresAt);
        }
        return response.data;
    },
    refreshToken: async () => {
        const response = await apiClient.post('/auth/refresh', {});
        return response.data;
    },
    registerUser: async (params: any) => {
        const response = await apiClient.post('/auth/register', params);
        return response.data;
    },
    getAuthUsers: async () => {
        const response = await apiClient.get('/auth/users');
        return response.data;
    },
    deleteAuthUser: async (id: number) => {
        const response = await apiClient.delete(`/auth/users/${id}`);
        return response.data;
    },
    getSuppliers: async () => {
        const response = await apiClient.get("/suppliers");
        return response.data;
    },
    getSuppliersPaginated: async (page: number = 1, limit: number = 10, search?: string, signal?: AbortSignal) => {
        const response = await apiClient.get("/suppliers/paginated", {
            params: { page, limit, search },
            signal,
        });
        return response.data;
    },
    createSupplier: async (data: any) => {
        const response = await apiClient.post("/suppliers", data);
        return response.data;
    },
    updateSupplier: async (id: number, data: any) => {
        const response = await apiClient.put(`/suppliers/${id}`, data);
        return response.data;
    },
    deleteSupplier: async (id: number) => {
        await apiClient.delete(`/suppliers/${id}`);
    },
    getOrders: async () => {
        const response = await apiClient.get("/orders");
        return response.data;
    },
    getOrdersPaginated: async (page: number = 1, limit: number = 10, search?: string, status?: string, signal?: AbortSignal) => {
        const response = await apiClient.get("/orders/paginated", {
            params: { page, limit, search, status },
            signal,
        });
        return response.data;
    },
    getOrder: async (id: number) => {
        const response = await apiClient.get(`/orders/${id}`);
        return response.data;
    },
    createOrder: async (data: any) => {
        const response = await apiClient.post("/orders", data);
        return response.data;
    },
    updateOrder: async (id: number, data: any) => {
        const response = await apiClient.put(`/orders/${id}`, data);
        return response.data;
    },
    deleteOrder: async (id: number) => {
        await apiClient.delete(`/orders/${id}`);
    },
    // Users
    getUsers: async () => {
        const response = await apiClient.get("/users");
        return response.data;
    },
    seedUsers: async () => {
        const response = await apiClient.post("/users/seed");
        return response.data;
    },

    // Approvals
    submitApproval: async (data: any) => {
        const response = await apiClient.post("/approvals", data);
        return response.data;
    },
    getApprovalHistory: async (poId: number) => {
        const response = await apiClient.get(`/approvals/history/${poId}`);
        return response.data;
    },

    // Dispatches
    getDispatches: async (page: number = 1, limit: number = 10, search?: string) => {
        const response = await apiClient.get("/dispatches", {
            params: { page, limit, search }
        });
        return response.data;
    },
    createDispatch: async (data: any) => {
        const response = await apiClient.post("/dispatches", data);
        return response.data;
    },
    getDispatchById: async (id: number) => {
        const response = await apiClient.get(`/dispatches/${id}`);
        return response.data;
    },
    updateDispatchStatus: async (id: number, status: string, notes?: string) => {
        const response = await apiClient.put(`/dispatches/${id}/status`, { status, notes });
        return response.data;
    },

    // Dashboard
    getDashboardStats: async () => {
        const response = await apiClient.get("/dashboard/stats");
        return response.data;
    },
    getDelayedOrders: async () => {
        const response = await apiClient.get("/dashboard/delayed");
        return response.data;
    },
    getOrdersByDivision: async () => {
        const response = await apiClient.get("/dashboard/by-division");
        return response.data;
    },

    // Divisions
    getDivisions: async () => {
        const response = await apiClient.get("/divisions");
        return response.data;
    },
    getDivisionsPaginated: async (page: number = 1, limit: number = 10, search?: string, signal?: AbortSignal) => {
        const response = await apiClient.get("/divisions/paginated", {
            params: { page, limit, search },
            signal,
        });
        return response.data;
    },
    createDivision: async (data: any) => {
        const response = await apiClient.post("/divisions", data);
        return response.data;
    },
    updateDivision: async (id: number, data: any) => {
        const response = await apiClient.put(`/divisions/${id}`, data);
        return response.data;
    },
    deleteDivision: async (id: number) => {
        await apiClient.delete(`/divisions/${id}`);
    },

    // Product Categories
    getProductCategories: async () => {
        const response = await apiClient.get("/product-categories");
        return response.data;
    },
    getProductCategoriesPaginated: async (page: number = 1, limit: number = 10, search?: string, signal?: AbortSignal) => {
        const response = await apiClient.get("/product-categories/paginated", {
            params: { page, limit, search },
            signal,
        });
        return response.data;
    },
    createProductCategory: async (data: any) => {
        const response = await apiClient.post("/product-categories", data);
        return response.data;
    },
    updateProductCategory: async (id: number, data: any) => {
        const response = await apiClient.put(`/product-categories/${id}`, data);
        return response.data;
    },
    deleteProductCategory: async (id: number) => {
        await apiClient.delete(`/product-categories/${id}`);
    },

    // Products
    getProducts: async () => {
        const response = await apiClient.get("/products");
        return response.data;
    },
    getProductsPaginated: async (page: number = 1, limit: number = 10, search?: string, signal?: AbortSignal) => {
        const response = await apiClient.get("/products/paginated", {
            params: { page, limit, search },
            signal,
        });
        return response.data;
    },
    createProduct: async (data: any) => {
        const response = await apiClient.post("/products", data);
        return response.data;
    },
    updateProduct: async (id: number, data: any) => {
        const response = await apiClient.put(`/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id: number) => {
        await apiClient.delete(`/products/${id}`);
    },

    // Inventory
    getInventory: async () => {
        const response = await apiClient.get("/inventory");
        return response.data;
    },
    getInventoryHistory: async (productId: number) => {
        const response = await apiClient.get(`/inventory/history/${productId}`);
        return response.data;
    },
    updateInventory: async (data: any) => {
        const response = await apiClient.post("/inventory/update", data);
        return response.data;
    },

    // Audit Logs
    getAuditLogsPaginated: async (
        page: number = 1,
        limit: number = 20,
        search?: string,
        entityType?: string,
        action?: string,
        entityId?: number,
        signal?: AbortSignal
    ) => {
        const response = await apiClient.get("/audit/paginated", {
            params: { page, limit, search, entityType, action, entityId },
            signal,
        });
        return response.data;
    },
    getEntityAuditHistory: async (entityType: string, entityId: number) => {
        const response = await apiClient.get(`/audit/${entityType}/${entityId}`);
        return response.data;
    },
};

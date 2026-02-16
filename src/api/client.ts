import axios from 'axios';

//const BASE_URL = 'http://localhost:3000/v1';
const BASE_URL = 'https://creativeworld.info/kdm-procurex-backend/v1';

const apiClient = axios.create({
    baseURL: BASE_URL,
});

// Add interceptor for JWT
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('procurex_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const api = {
    // Auth
    login: async (params: any) => {
        const response = await apiClient.post('/auth/login', params);
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

    // Tracking
    addTrackingUpdate: async (data: any) => {
        const response = await apiClient.post("/tracking", data);
        return response.data;
    },
    getTrackingHistory: async (poId: number) => {
        const response = await apiClient.get(`/tracking/${poId}`);
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
};

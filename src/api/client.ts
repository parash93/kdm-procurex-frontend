import axios from "axios";

const API_URL = "http://localhost:3000";

export const client = axios.create({
    baseURL: API_URL,
});

export const api = {
    getSuppliers: async () => {
        const response = await client.get("/suppliers");
        return response.data;
    },
    createSupplier: async (data: any) => {
        const response = await client.post("/suppliers", data);
        return response.data;
    },
    updateSupplier: async (id: string, data: any) => {
        const response = await client.put(`/suppliers/${id}`, data);
        return response.data;
    },
    deleteSupplier: async (id: string) => {
        await client.delete(`/suppliers/${id}`);
    },
    getOrders: async () => {
        const response = await client.get("/orders");
        return response.data;
    },
    getOrder: async (id: string) => {
        const response = await client.get(`/orders/${id}`);
        return response.data;
    },
    createOrder: async (data: any) => {
        const response = await client.post("/orders", data);
        return response.data;
    },
    updateOrder: async (id: string, data: any) => {
        const response = await client.put(`/orders/${id}`, data);
        return response.data;
    },
    deleteOrder: async (id: string) => {
        await client.delete(`/orders/${id}`);
    },
    // Users
    getUsers: async () => {
        const response = await client.get("/users");
        return response.data;
    },
    seedUsers: async () => {
        const response = await client.post("/users/seed");
        return response.data;
    },

    // Approvals
    submitApproval: async (data: any) => {
        const response = await client.post("/approvals", data);
        return response.data;
    },
    getApprovalHistory: async (poId: string) => {
        const response = await client.get(`/approvals/history/${poId}`);
        return response.data;
    },

    // Tracking
    addTrackingUpdate: async (data: any) => {
        const response = await client.post("/tracking", data);
        return response.data;
    },
    getTrackingHistory: async (poId: string) => {
        const response = await client.get(`/tracking/${poId}`);
        return response.data;
    },

    // Dashboard
    getDashboardStats: async () => {
        const response = await client.get("/dashboard/stats");
        return response.data;
    },
    getDelayedOrders: async () => {
        const response = await client.get("/dashboard/delayed");
        return response.data;
    },
    getOrdersByStatus: async () => {
        const response = await client.get("/dashboard/by-status");
        return response.data;
    },
    getOrdersByDivision: async () => {
        const response = await client.get("/dashboard/by-division");
        return response.data;
    },

    // Divisions
    getDivisions: async () => {
        const response = await client.get("/divisions");
        return response.data;
    },
    createDivision: async (data: any) => {
        const response = await client.post("/divisions", data);
        return response.data;
    },
    updateDivision: async (id: string, data: any) => {
        const response = await client.put(`/divisions/${id}`, data);
        return response.data;
    },
    deleteDivision: async (id: string) => {
        await client.delete(`/divisions/${id}`);
    },

    // Product Categories
    getProductCategories: async () => {
        const response = await client.get("/product-categories");
        return response.data;
    },
    createProductCategory: async (data: any) => {
        const response = await client.post("/product-categories", data);
        return response.data;
    },
    updateProductCategory: async (id: string, data: any) => {
        const response = await client.put(`/product-categories/${id}`, data);
        return response.data;
    },
    deleteProductCategory: async (id: string) => {
        await client.delete(`/product-categories/${id}`);
    },

    // Products
    getProducts: async () => {
        const response = await client.get("/products");
        return response.data;
    },
    createProduct: async (data: any) => {
        const response = await client.post("/products", data);
        return response.data;
    },
    updateProduct: async (id: string, data: any) => {
        const response = await client.put(`/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id: string) => {
        await client.delete(`/products/${id}`);
    },
};

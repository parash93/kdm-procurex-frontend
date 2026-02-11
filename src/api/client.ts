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
    createOrder: async (data: any) => {
        const response = await client.post("/orders", data);
        return response.data;
    }
};

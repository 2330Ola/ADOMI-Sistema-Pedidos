import api from "../api/api";

const getToken = () => {
    return localStorage.getItem("token");
};

const config = () => {
    return {
        headers: {
            Authorization: `Bearer ${getToken()}`
        }
    };
};

// CLIENTE
export const createOrder = async (orderData) => {
    const response = await api.post(
        "/orders",
        orderData,
        config()
    );

    return response.data;
};

export const getMyOrders = async () => {
    const response = await api.get(
        "/orders/mis-pedidos",
        config()
    );

    return response.data;
};

// HISTORIAL
export const getOrderHistory = async (orderId) => {
    const response = await api.get(
        `/orders/${orderId}/historial`,
        config()
    );

    return response.data;
};

// REPARTIDOR
export const getPendingOrders = async () => {
    const response = await api.get(
        "/orders/pendientes",
        config()
    );

    return response.data;
};

export const getMyDeliveries = async () => {
    const response = await api.get(
        "/orders/mis-entregas",
        config()
    );

    return response.data;
};

export const acceptOrder = async (orderId) => {
    const response = await api.put(
        `/orders/${orderId}/aceptar`,
        {},
        config()
    );

    return response.data;
};

export const updateOrderStatus = async (orderId, estado) => {
    const response = await api.put(
        `/orders/${orderId}/estado`,
        { estado },
        config()
    );

    return response.data;
};

export const confirmRealTotal = async (orderId, totalReal, totalEstimado) => {
    const response = await api.put(
        `/orders/${orderId}/confirmar-total`,
        {
            total_real: Number(totalReal),
            total_estimado: Number(totalEstimado)
        },
        config()
    );

    return response.data;
};
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

export const getDashboardStats = async () => {
    const response = await api.get(
        "/admin/dashboard",
        config()
    );

    return response.data;
};

export const getAllUsers = async () => {
    const response = await api.get(
        "/admin/usuarios",
        config()
    );

    return response.data;
};

export const getClients = async () => {
    const response = await api.get(
        "/admin/clientes",
        config()
    );

    return response.data;
};

export const getDeliveryUsers = async () => {
    const response = await api.get(
        "/admin/repartidores",
        config()
    );

    return response.data;
};

export const updateUserStatus = async (userId, estado) => {
    const response = await api.put(
        `/admin/usuarios/${userId}/estado`,
        { estado },
        config()
    );

    return response.data;
};

export const createDeliveryUser = async (nombre, correo, password) => {
    const response = await api.post(
        "/auth/register",
        {
            nombre,
            correo,
            password,
            rol: "repartidor"
        }
    );

    return response.data;
};

export const getAllOrdersAdmin = async () => {
    const response = await api.get(
        "/orders",
        config()
    );

    return response.data;
};
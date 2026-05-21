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

export const sendMessage = async (pedidoId, mensaje) => {
    const response = await api.post(
        `/messages/pedido/${pedidoId}`,
        { mensaje },
        config()
    );

    return response.data;
};

export const getMessagesByOrder = async (pedidoId) => {
    const response = await api.get(
        `/messages/pedido/${pedidoId}`,
        config()
    );

    return response.data;
};
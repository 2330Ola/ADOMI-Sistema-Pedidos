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

export const updateMyLocation = async (latitud, longitud) => {
    const response = await api.put(
        "/locations/mi-ubicacion",
        {
            latitud,
            longitud
        },
        config()
    );

    return response.data;
};

export const getDeliveryLocation = async (repartidorId) => {
    const response = await api.get(
        `/locations/repartidor/${repartidorId}`,
        config()
    );

    return response.data;
};
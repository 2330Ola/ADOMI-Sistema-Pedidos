import api from "../api/api";

export const loginUser = async (correo, password) => {
    const response = await api.post("/auth/login", {
        correo,
        password
    });

    return response.data;
};

export const registerUser = async (nombre, correo, password, rol) => {
    const response = await api.post("/auth/register", {
        nombre,
        correo,
        password,
        rol
    });

    return response.data;
};
import axios from "axios";

const api = axios.create({
    baseURL: "https://adomi-sistema-pedidos.onrender.com/api"
});

export default api;
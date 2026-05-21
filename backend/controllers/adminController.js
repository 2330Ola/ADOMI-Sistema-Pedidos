const adminModel = require("../models/adminModel");

const getAllUsers = (req, res) => {
    adminModel.getAllUsers((err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener usuarios",
                error: err
            });
        }

        res.json({
            message: "Usuarios obtenidos correctamente",
            usuarios: results
        });
    });
};

const getClients = (req, res) => {
    adminModel.getUsersByRole("cliente", (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener clientes",
                error: err
            });
        }

        res.json({
            message: "Clientes obtenidos correctamente",
            clientes: results
        });
    });
};

const getDeliveryUsers = (req, res) => {
    adminModel.getUsersByRole("repartidor", (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener repartidores",
                error: err
            });
        }

        res.json({
            message: "Repartidores obtenidos correctamente",
            repartidores: results
        });
    });
};

const updateUserStatus = (req, res) => {
    const userId = req.params.id;
    const { estado } = req.body || {};

    const estadosPermitidos = ["activo", "inactivo"];

    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
            message: "Estado no válido. Use activo o inactivo"
        });
    }

    adminModel.updateUserStatus(userId, estado, (err, result) => {
        if (err) {
            return res.status(500).json({
                message: "Error al actualizar estado del usuario",
                error: err
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Usuario no encontrado"
            });
        }

        res.json({
            message: "Estado del usuario actualizado correctamente"
        });
    });
};

const getDashboardStats = (req, res) => {
    adminModel.getDashboardStats((err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener estadísticas",
                error: err
            });
        }

        res.json({
            message: "Estadísticas obtenidas correctamente",
            stats: results[0]
        });
    });
};

module.exports = {
    getAllUsers,
    getClients,
    getDeliveryUsers,
    updateUserStatus,
    getDashboardStats
};
const orderModel = require("../models/orderModel");
const historyModel = require("../models/historyModel");

const createOrder = (req, res) => {
    const clienteId = req.user.id;

    const {
        tipo_servicio,
        descripcion,
        direccion,
        total
    } = req.body || {};

    if (!tipo_servicio || !descripcion || !direccion || !total) {
        return res.status(400).json({
            message: "Todos los campos son obligatorios"
        });
    }

    orderModel.createOrder(
        clienteId,
        tipo_servicio,
        descripcion,
        direccion,
        total,
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al crear pedido",
                    error: err
                });
            }

            const pedidoId = result.insertId;

            historyModel.createHistory(
                pedidoId,
                "pendiente",
                "Pedido creado por el cliente",
                () => {}
            );

            res.status(201).json({
                message: "Pedido creado correctamente",
                pedido_id: pedidoId
            });
        }
    );
};

const getMyOrders = (req, res) => {
    const clienteId = req.user.id;

    orderModel.getOrdersByClient(clienteId, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener pedidos",
                error: err
            });
        }

        res.json({
            message: "Pedidos del cliente",
            pedidos: results
        });
    });
};

const getPendingOrders = (req, res) => {
    orderModel.getPendingOrders((err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener pedidos pendientes",
                error: err
            });
        }

        res.json({
            message: "Pedidos pendientes",
            pedidos: results
        });
    });
};

const getMyDeliveries = (req, res) => {
    const repartidorId = req.user.id;

    orderModel.getOrdersByDelivery(repartidorId, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener entregas",
                error: err
            });
        }

        res.json({
            message: "Pedidos asignados al repartidor",
            pedidos: results
        });
    });
};

const acceptOrder = (req, res) => {
    const repartidorId = req.user.id;
    const pedidoId = req.params.id;

    orderModel.acceptOrder(pedidoId, repartidorId, (err, result) => {
        if (err) {
            return res.status(500).json({
                message: "Error al aceptar pedido",
                error: err
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "El pedido no está disponible o ya fue aceptado"
            });
        }

        historyModel.createHistory(
            pedidoId,
            "aceptado",
            "Pedido aceptado por el repartidor",
            () => {}
        );

        res.json({
            message: "Pedido aceptado correctamente"
        });
    });
};

const rejectOrder = (req, res) => {
    const pedidoId = req.params.id;

    orderModel.rejectOrder(pedidoId, (err, result) => {
        if (err) {
            return res.status(500).json({
                message: "Error al rechazar pedido",
                error: err
            });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({
                message: "No puede rechazar este pedido. Ya fue entregado, cancelado o no existe."
            });
        }

        historyModel.createHistory(
            pedidoId,
            "pendiente",
            "Pedido rechazado y devuelto a pendientes",
            () => {}
        );

        res.json({
            message: "Pedido rechazado correctamente"
        });
    });
};

const updateOrderStatus = (req, res) => {
    const repartidorId = req.user.id;
    const pedidoId = req.params.id;

    const { estado } = req.body || {};

    const estadosPermitidos = ["aceptado", "en camino", "entregado", "cancelado"];

    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({
            message: "Estado no válido"
        });
    }

    orderModel.updateOrderStatus(
        pedidoId,
        repartidorId,
        estado,
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al actualizar estado",
                    error: err
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    message: "No puede modificar este pedido. Ya fue entregado, cancelado o no le pertenece."
                });
            }

            historyModel.createHistory(
                pedidoId,
                estado,
                `Estado actualizado a ${estado}`,
                () => {}
            );

            res.json({
                message: "Estado actualizado correctamente"
            });
        }
    );
};

const confirmRealTotal = (req, res) => {
    const repartidorId = req.user.id;
    const pedidoId = req.params.id;

    const { total_real, total_estimado } = req.body || {};

    if (!total_real || !total_estimado) {
        return res.status(400).json({
            message: "Total real y total estimado son obligatorios"
        });
    }

    const totalRealNumber = Number(total_real);
    const totalEstimadoNumber = Number(total_estimado);

    if (Number.isNaN(totalRealNumber) || Number.isNaN(totalEstimadoNumber)) {
        return res.status(400).json({
            message: "Los totales deben ser valores numéricos"
        });
    }

    const diferencia = totalRealNumber - totalEstimadoNumber;

    orderModel.confirmRealTotal(
        pedidoId,
        repartidorId,
        totalRealNumber,
        diferencia,
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al confirmar total real",
                    error: err
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    message: "No puede confirmar el total. Ya fue confirmado, entregado, cancelado o no le pertenece."
                });
            }

            historyModel.createHistory(
                pedidoId,
                "total confirmado",
                `Total real confirmado: Q${totalRealNumber}. Diferencia: Q${diferencia}`,
                () => {}
            );

            res.json({
                message: "Total real confirmado correctamente",
                total_real: totalRealNumber,
                diferencia
            });
        }
    );
};

const getAllOrders = (req, res) => {
    orderModel.getAllOrders((err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener pedidos",
                error: err
            });
        }

        res.json({
            message: "Todos los pedidos",
            pedidos: results
        });
    });
};

const getOrderHistory = (req, res) => {
    const pedidoId = req.params.id;

    historyModel.getHistoryByOrder(pedidoId, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener historial",
                error: err
            });
        }

        res.json({
            message: "Historial del pedido",
            historial: results
        });
    });
};

module.exports = {
    createOrder,
    getMyOrders,
    getPendingOrders,
    getMyDeliveries,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    confirmRealTotal,
    getAllOrders,
    getOrderHistory
};
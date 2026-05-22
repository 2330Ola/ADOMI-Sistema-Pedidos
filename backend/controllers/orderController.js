const orderModel = require("../models/orderModel");
const historyModel = require("../models/historyModel");

const emitPedidoActualizado = (req, pedidoId, data = {}) => {
    const io = req.app.get("io");

    if (!io) {
        return;
    }

    io.to(`pedido_${pedidoId}`).emit(
        "pedidoActualizado",
        {
            id: Number(pedidoId),
            ...data
        }
    );
};

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

            emitPedidoActualizado(req, pedidoId, {
                estado: "pendiente"
            });

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

        emitPedidoActualizado(req, pedidoId, {
            estado: "aceptado",
            repartidor_id: repartidorId
        });

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
                message: "No puede rechazar este pedido"
            });
        }

        historyModel.createHistory(
            pedidoId,
            "pendiente",
            "Pedido rechazado y devuelto a pendientes",
            () => {}
        );

        emitPedidoActualizado(req, pedidoId, {
            estado: "pendiente",
            repartidor_id: null
        });

        res.json({
            message: "Pedido rechazado correctamente"
        });
    });
};

const updateOrderStatus = (req, res) => {
    const repartidorId = req.user.id;
    const pedidoId = req.params.id;

    const { estado } = req.body || {};

    const estadosPermitidos = [
        "aceptado",
        "en camino",
        "cancelado"
    ];

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

            emitPedidoActualizado(req, pedidoId, {
                estado
            });

            res.json({
                message: "Estado actualizado correctamente"
            });
        }
    );
};

const confirmRealTotal = (req, res) => {
    const repartidorId = req.user.id;
    const pedidoId = req.params.id;

    const {
        total_real,
        total_estimado
    } = req.body || {};

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

            emitPedidoActualizado(req, pedidoId, {
                total_real: totalRealNumber,
                diferencia
            });

            res.json({
                message: "Total real confirmado correctamente",
                total_real: totalRealNumber,
                diferencia
            });
        }
    );
};

const confirmDelivery = (req, res) => {
    const repartidorId = req.user.id;
    const pedidoId = req.params.id;

    const { observacion_entrega } = req.body || {};

    if (!observacion_entrega || !observacion_entrega.trim()) {
        return res.status(400).json({
            message: "La observación de entrega es obligatoria"
        });
    }

    orderModel.confirmDelivery(
        pedidoId,
        repartidorId,
        observacion_entrega.trim(),
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al confirmar entrega",
                    error: err
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    message: "No puede confirmar esta entrega. Ya fue entregada, cancelada o no le pertenece."
                });
            }

            historyModel.createHistory(
                pedidoId,
                "entregado",
                `Pedido entregado. Observación: ${observacion_entrega.trim()}`,
                () => {}
            );

            emitPedidoActualizado(req, pedidoId, {
                estado: "entregado",
                observacion_entrega: observacion_entrega.trim(),
                fecha_entrega: new Date().toISOString()
            });

            res.json({
                message: "Entrega confirmada correctamente"
            });
        }
    );
};

const confirmClientReception = (req, res) => {
    const clienteId = req.user.id;
    const pedidoId = req.params.id;

    const {
        confirmacion_cliente,
        comentario_cliente
    } = req.body || {};

    const confirmacionesPermitidas = [
        "confirmado",
        "problema"
    ];

    if (!confirmacionesPermitidas.includes(confirmacion_cliente)) {
        return res.status(400).json({
            message: "Confirmación no válida"
        });
    }

    if (
        confirmacion_cliente === "problema" &&
        (!comentario_cliente || !comentario_cliente.trim())
    ) {
        return res.status(400).json({
            message: "Debe escribir el motivo del problema"
        });
    }

    const comentarioFinal = comentario_cliente
        ? comentario_cliente.trim()
        : null;

    orderModel.confirmClientReception(
        pedidoId,
        clienteId,
        confirmacion_cliente,
        comentarioFinal,
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al confirmar recepción",
                    error: err
                });
            }

            if (result.affectedRows === 0) {
                return res.status(400).json({
                    message: "No puede confirmar este pedido. Puede que no esté entregado, no le pertenezca o ya fue confirmado."
                });
            }

            const comentarioHistorial =
                confirmacion_cliente === "confirmado"
                    ? "Cliente confirmó que recibió el pedido correctamente"
                    : `Cliente reportó un problema: ${comentarioFinal}`;

            historyModel.createHistory(
                pedidoId,
                confirmacion_cliente,
                comentarioHistorial,
                () => {}
            );

            emitPedidoActualizado(req, pedidoId, {
                confirmacion_cliente,
                comentario_cliente: comentarioFinal,
                fecha_confirmacion_cliente: new Date().toISOString()
            });

            res.json({
                message: "Confirmación del cliente registrada correctamente"
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
    confirmDelivery,
    confirmClientReception,
    getAllOrders,
    getOrderHistory
};
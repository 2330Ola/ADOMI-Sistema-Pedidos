const db = require("../config/db");

const createOrder = (
    clienteId,
    tipoServicio,
    descripcion,
    direccion,
    total,
    callback
) => {
    const sql = `
        INSERT INTO pedidos
        (cliente_id, tipo_servicio, descripcion, direccion, total)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [clienteId, tipoServicio, descripcion, direccion, total], callback);
};

const getOrdersByClient = (clienteId, callback) => {
    const sql = `
        SELECT *
        FROM pedidos
        WHERE cliente_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [clienteId], callback);
};

const getPendingOrders = (callback) => {
    const sql = `
        SELECT 
            pedidos.*,
            usuarios.nombre AS cliente_nombre,
            usuarios.correo AS cliente_correo
        FROM pedidos
        INNER JOIN usuarios 
            ON pedidos.cliente_id = usuarios.id
        WHERE pedidos.estado = 'pendiente'
        ORDER BY pedidos.created_at ASC
    `;

    db.query(sql, callback);
};

const getOrdersByDelivery = (repartidorId, callback) => {
    const sql = `
        SELECT 
            pedidos.*,
            usuarios.nombre AS cliente_nombre,
            usuarios.correo AS cliente_correo
        FROM pedidos
        INNER JOIN usuarios 
            ON pedidos.cliente_id = usuarios.id
        WHERE pedidos.repartidor_id = ?
        ORDER BY pedidos.created_at DESC
    `;

    db.query(sql, [repartidorId], callback);
};

const acceptOrder = (pedidoId, repartidorId, callback) => {
    const sql = `
        UPDATE pedidos
        SET estado = 'aceptado',
            repartidor_id = ?
        WHERE id = ?
        AND estado = 'pendiente'
    `;

    db.query(sql, [repartidorId, pedidoId], callback);
};

const rejectOrder = (pedidoId, callback) => {
    const sql = `
        UPDATE pedidos
        SET estado = 'pendiente',
            repartidor_id = NULL
        WHERE id = ?
        AND estado NOT IN ('entregado', 'cancelado')
    `;

    db.query(sql, [pedidoId], callback);
};

const updateOrderStatus = (
    pedidoId,
    repartidorId,
    estado,
    callback
) => {
    const sql = `
        UPDATE pedidos
        SET estado = ?
        WHERE id = ?
        AND repartidor_id = ?
        AND estado NOT IN ('entregado', 'cancelado')
    `;

    db.query(sql, [estado, pedidoId, repartidorId], callback);
};

const confirmRealTotal = (
    pedidoId,
    repartidorId,
    totalReal,
    diferencia,
    callback
) => {
    const sql = `
        UPDATE pedidos
        SET total_real = ?,
            diferencia = ?
        WHERE id = ?
        AND repartidor_id = ?
        AND total_real IS NULL
        AND estado NOT IN ('entregado', 'cancelado')
    `;

    db.query(sql, [totalReal, diferencia, pedidoId, repartidorId], callback);
};

const confirmDelivery = (
    pedidoId,
    repartidorId,
    observacionEntrega,
    callback
) => {
    const sql = `
        UPDATE pedidos
        SET estado = 'entregado',
            observacion_entrega = ?,
            fecha_entrega = CURRENT_TIMESTAMP
        WHERE id = ?
        AND repartidor_id = ?
        AND estado NOT IN ('entregado', 'cancelado')
    `;

    db.query(sql, [observacionEntrega, pedidoId, repartidorId], callback);
};

const confirmClientReception = (
    pedidoId,
    clienteId,
    confirmacionCliente,
    comentarioCliente,
    callback
) => {
    const sql = `
        UPDATE pedidos
        SET confirmacion_cliente = ?,
            comentario_cliente = ?,
            fecha_confirmacion_cliente = CURRENT_TIMESTAMP
        WHERE id = ?
        AND cliente_id = ?
        AND estado = 'entregado'
        AND confirmacion_cliente IS NULL
    `;

    db.query(
        sql,
        [
            confirmacionCliente,
            comentarioCliente,
            pedidoId,
            clienteId
        ],
        callback
    );
};

const getAllOrders = (callback) => {
    const sql = `
        SELECT 
            pedidos.*,
            cliente.nombre AS cliente_nombre,
            repartidor.nombre AS repartidor_nombre
        FROM pedidos
        INNER JOIN usuarios AS cliente 
            ON pedidos.cliente_id = cliente.id
        LEFT JOIN usuarios AS repartidor 
            ON pedidos.repartidor_id = repartidor.id
        ORDER BY pedidos.created_at DESC
    `;

    db.query(sql, callback);
};

module.exports = {
    createOrder,
    getOrdersByClient,
    getPendingOrders,
    getOrdersByDelivery,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    confirmRealTotal,
    confirmDelivery,
    confirmClientReception,
    getAllOrders
};
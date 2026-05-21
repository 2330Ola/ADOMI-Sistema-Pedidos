const db = require("../config/db");

const createMessage = (pedidoId, usuarioId, mensaje, callback) => {
    const sql = `
        INSERT INTO mensajes
        (pedido_id, usuario_id, mensaje)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [pedidoId, usuarioId, mensaje], callback);
};

const getMessagesByOrder = (pedidoId, callback) => {
    const sql = `
        SELECT 
            mensajes.id,
            mensajes.pedido_id,
            mensajes.usuario_id,
            mensajes.mensaje,
            mensajes.fecha,
            usuarios.nombre AS usuario_nombre,
            usuarios.rol AS usuario_rol
        FROM mensajes
        INNER JOIN usuarios ON mensajes.usuario_id = usuarios.id
        WHERE mensajes.pedido_id = ?
        ORDER BY mensajes.fecha ASC
    `;

    db.query(sql, [pedidoId], callback);
};

module.exports = {
    createMessage,
    getMessagesByOrder
};
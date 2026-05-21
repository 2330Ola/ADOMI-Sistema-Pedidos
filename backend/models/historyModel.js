const db = require("../config/db");

const createHistory = (pedidoId, estado, comentario, callback) => {
    const sql = `
        INSERT INTO historial_estados
        (pedido_id, estado, comentario)
        VALUES (?, ?, ?)
    `;

    db.query(
        sql,
        [pedidoId, estado, comentario],
        callback
    );
};

const getHistoryByOrder = (pedidoId, callback) => {
    const sql = `
        SELECT *
        FROM historial_estados
        WHERE pedido_id = ?
        ORDER BY fecha ASC
    `;

    db.query(sql, [pedidoId], callback);
};

module.exports = {
    createHistory,
    getHistoryByOrder
};
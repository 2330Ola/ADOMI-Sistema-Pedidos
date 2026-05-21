const db = require("../config/db");

const getAllUsers = (callback) => {
    const sql = `
        SELECT id, nombre, correo, rol, estado, created_at
        FROM usuarios
        ORDER BY created_at DESC
    `;

    db.query(sql, callback);
};

const getUsersByRole = (rol, callback) => {
    const sql = `
        SELECT id, nombre, correo, rol, estado, created_at
        FROM usuarios
        WHERE rol = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [rol], callback);
};

const updateUserStatus = (userId, estado, callback) => {
    const sql = `
        UPDATE usuarios
        SET estado = ?
        WHERE id = ?
    `;

    db.query(sql, [estado, userId], callback);
};

const getDashboardStats = (callback) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente') AS total_clientes,
            (SELECT COUNT(*) FROM usuarios WHERE rol = 'repartidor') AS total_repartidores,
            (SELECT COUNT(*) FROM pedidos) AS total_pedidos,
            (SELECT COUNT(*) FROM pedidos WHERE estado = 'pendiente') AS pedidos_pendientes,
            (SELECT COUNT(*) FROM pedidos WHERE estado = 'aceptado') AS pedidos_aceptados,
            (SELECT COUNT(*) FROM pedidos WHERE estado = 'en camino') AS pedidos_en_camino,
            (SELECT COUNT(*) FROM pedidos WHERE estado = 'entregado') AS pedidos_entregados,
            (SELECT COUNT(*) FROM pedidos WHERE estado = 'cancelado') AS pedidos_cancelados,
            (SELECT IFNULL(SUM(total_real), 0) FROM pedidos WHERE estado = 'entregado') AS ingresos_entregados
    `;

    db.query(sql, callback);
};

module.exports = {
    getAllUsers,
    getUsersByRole,
    updateUserStatus,
    getDashboardStats
};
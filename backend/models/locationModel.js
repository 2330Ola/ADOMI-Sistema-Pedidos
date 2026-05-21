const db = require("../config/db");

const saveLocation = (repartidorId, latitud, longitud, callback) => {
    const sql = `
        INSERT INTO ubicaciones (repartidor_id, latitud, longitud)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            latitud = VALUES(latitud),
            longitud = VALUES(longitud),
            updated_at = CURRENT_TIMESTAMP
    `;

    db.query(sql, [repartidorId, latitud, longitud], callback);
};

const getLocationByDelivery = (repartidorId, callback) => {
    const sql = `
        SELECT *
        FROM ubicaciones
        WHERE repartidor_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
    `;

    db.query(sql, [repartidorId], callback);
};

module.exports = {
    saveLocation,
    getLocationByDelivery
};
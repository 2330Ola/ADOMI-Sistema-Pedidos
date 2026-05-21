const db = require("../config/db");

const createUser = (
    nombre,
    correo,
    password,
    rol,
    callback
) => {

    const sql = `
        INSERT INTO usuarios
        (nombre, correo, password, rol)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [nombre, correo, password, rol],
        callback
    );

};

const findUserByEmail = (
    correo,
    callback
) => {

    const sql = `
        SELECT * FROM usuarios
        WHERE correo = ?
    `;

    db.query(sql, [correo], callback);

};

module.exports = {
    createUser,
    findUserByEmail
};
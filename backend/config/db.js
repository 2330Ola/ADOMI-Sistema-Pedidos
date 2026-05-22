const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: process.env.MYSQLHOST || "localhost",
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "adomi_db"
});

connection.connect((err) => {
    if (err) {
        console.log("Error de conexión MySQL:", err);
    } else {
        console.log("MySQL conectado");
    }
});

module.exports = connection;
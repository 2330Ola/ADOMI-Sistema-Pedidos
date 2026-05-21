const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Token requerido"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "secretKey");

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Token inválido"
        });
    }
};

const isCliente = (req, res, next) => {
    if (req.user.rol !== "cliente") {
        return res.status(403).json({
            message: "Acceso permitido solo para clientes"
        });
    }

    next();
};

const isRepartidor = (req, res, next) => {
    if (req.user.rol !== "repartidor") {
        return res.status(403).json({
            message: "Acceso permitido solo para repartidores"
        });
    }

    next();
};

const isAdmin = (req, res, next) => {
    if (req.user.rol !== "admin") {
        return res.status(403).json({
            message: "Acceso permitido solo para administradores"
        });
    }

    next();
};

module.exports = {
    verifyToken,
    isCliente,
    isRepartidor,
    isAdmin
};
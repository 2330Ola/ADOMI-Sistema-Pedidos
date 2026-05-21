const express = require("express");

const router = express.Router();

const {
    verifyToken
} = require("../middleware/authMiddleware");


// RUTA PRIVADA
router.get(
    "/private",
    verifyToken,

    (req, res) => {

        res.json({
            message: "Ruta privada funcionando",
            user: req.user
        });

    }
);

module.exports = router;
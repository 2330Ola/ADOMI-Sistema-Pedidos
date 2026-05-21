const express = require("express");

const router = express.Router();

const locationController = require("../controllers/locationController");

const {
    verifyToken,
    isRepartidor
} = require("../middleware/authMiddleware");

router.put(
    "/mi-ubicacion",
    verifyToken,
    isRepartidor,
    locationController.updateMyLocation
);

router.get(
    "/repartidor/:repartidorId",
    verifyToken,
    locationController.getDeliveryLocation
);

module.exports = router;
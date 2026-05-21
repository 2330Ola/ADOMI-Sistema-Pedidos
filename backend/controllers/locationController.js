const locationModel = require("../models/locationModel");

const updateMyLocation = (req, res) => {
    const repartidorId = req.user.id;

    const { latitud, longitud } = req.body || {};

    if (!latitud || !longitud) {
        return res.status(400).json({
            message: "Latitud y longitud son obligatorias"
        });
    }

    locationModel.saveLocation(
        repartidorId,
        Number(latitud),
        Number(longitud),
        (err) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al guardar ubicación",
                    error: err
                });
            }

            res.json({
                message: "Ubicación actualizada correctamente",
                ubicacion: {
                    repartidor_id: repartidorId,
                    latitud: Number(latitud),
                    longitud: Number(longitud)
                }
            });
        }
    );
};

const getDeliveryLocation = (req, res) => {
    const repartidorId = req.params.repartidorId;

    locationModel.getLocationByDelivery(repartidorId, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener ubicación",
                error: err
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Ubicación no disponible"
            });
        }

        res.json({
            message: "Ubicación obtenida correctamente",
            ubicacion: results[0]
        });
    });
};

module.exports = {
    updateMyLocation,
    getDeliveryLocation
};
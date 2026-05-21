import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

function DeliveryMap({ latitud, longitud }) {
    const position = [Number(latitud), Number(longitud)];

    return (
        <div style={{ height: "300px", width: "100%" }}>
            <MapContainer
                center={position}
                zoom={15}
                style={{ height: "100%", width: "100%", borderRadius: "16px" }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={position} icon={markerIcon}>
                    <Popup>
                        Ubicación actual del repartidor
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}

export default DeliveryMap;
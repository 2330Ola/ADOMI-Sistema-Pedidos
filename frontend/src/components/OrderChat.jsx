import { useEffect, useState } from "react";
import { getMessagesByOrder, sendMessage } from "../services/messageService";

function OrderChat({ pedidoId }) {
    const user = JSON.parse(localStorage.getItem("user"));

    const [mensajes, setMensajes] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const cargarMensajes = async () => {
        try {
            const data = await getMessagesByOrder(pedidoId);
            setMensajes(data.mensajes || []);
        } catch (error) {
            setError("No se pudieron cargar los mensajes");
        }
    };

    useEffect(() => {
        if (!pedidoId) return;

        cargarMensajes();

        const interval = setInterval(() => {
            cargarMensajes();
        }, 5000);

        return () => clearInterval(interval);
    }, [pedidoId]);

    const enviarMensaje = async (e) => {
        e.preventDefault();

        if (!mensaje.trim()) return;

        try {
            await sendMessage(pedidoId, mensaje);
            setMensaje("");
            setError("");
            cargarMensajes();
        } catch (error) {
            setError("No se pudo enviar el mensaje");
        }
    };

    return (
        <div>
            {error && (
                <div className="alert alert-danger py-2">
                    {error}
                </div>
            )}

            <div
                className="border rounded-4 p-3 bg-light mb-3"
                style={{ maxHeight: "260px", overflowY: "auto" }}
            >
                {mensajes.length === 0 ? (
                    <p className="text-muted text-center mb-0">
                        No hay mensajes todavía.
                    </p>
                ) : (
                    mensajes.map((item) => {
                        const esMio = item.usuario_id === user?.id;

                        return (
                            <div
                                key={item.id}
                                className={`mb-3 d-flex ${esMio ? "justify-content-end" : "justify-content-start"}`}
                            >
                                <div
                                    className={`p-2 rounded-3 ${esMio ? "bg-primary text-white" : "bg-white border"}`}
                                    style={{ maxWidth: "80%" }}
                                >
                                    <small className={esMio ? "text-white-50" : "text-muted"}>
                                        {item.usuario_nombre} · {item.usuario_rol}
                                    </small>

                                    <p className="mb-1">
                                        {item.mensaje}
                                    </p>

                                    <small className={esMio ? "text-white-50" : "text-muted"}>
                                        {new Date(item.fecha).toLocaleString()}
                                    </small>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <form onSubmit={enviarMensaje}>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Escribe un mensaje..."
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                    />

                    <button className="btn btn-primary">
                        Enviar
                    </button>
                </div>
            </form>
        </div>
    );
}

export default OrderChat;
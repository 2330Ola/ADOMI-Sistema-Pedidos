import { useEffect, useState } from "react";

import {
    createOrder,
    getMyOrders,
    getOrderHistory,
    confirmClientReception
} from "../services/orderService";

import { getDeliveryLocation } from "../services/locationService";

import DeliveryMap from "../components/DeliveryMap";
import OrderChat from "../components/OrderChat";
import socket from "../socket";

function ClienteDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [tipoServicio, setTipoServicio] = useState("restaurante");
    const [descripcion, setDescripcion] = useState("");
    const [direccion, setDireccion] = useState("");
    const [total, setTotal] = useState("");

    const [pedidos, setPedidos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const [pedidoMapa, setPedidoMapa] = useState(null);
    const [ubicacionRepartidor, setUbicacionRepartidor] = useState(null);

    const [pedidoChat, setPedidoChat] = useState(null);
    const [pedidoComprobante, setPedidoComprobante] = useState(null);
    const [comentariosCliente, setComentariosCliente] = useState({});

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [notificacion, setNotificacion] = useState("");
    const [cargando, setCargando] = useState(false);

    const cargarPedidos = async () => {
        try {
            const data = await getMyOrders();
            const nuevosPedidos = data.pedidos || [];

            setPedidos(nuevosPedidos);

            if (pedidoComprobante) {
                const pedidoActualizado = nuevosPedidos.find(
                    (p) => p.id === pedidoComprobante.id
                );

                if (pedidoActualizado) {
                    setPedidoComprobante(pedidoActualizado);
                }
            }
        } catch (error) {
            setError("No se pudieron cargar los pedidos");
        }
    };

    const cargarHistorial = async (pedidoId) => {
        try {
            const data = await getOrderHistory(pedidoId);
            setHistorial(data.historial || []);
        } catch (error) {
            setError("No se pudo cargar el historial");
        }
    };

    const cargarUbicacion = async (repartidorId) => {
        try {
            const data = await getDeliveryLocation(repartidorId);
            setUbicacionRepartidor(data.ubicacion);
        } catch (error) {
            setUbicacionRepartidor(null);
        }
    };

    useEffect(() => {
        cargarPedidos();
    }, []);

    useEffect(() => {
        pedidos.forEach((pedido) => {
            socket.emit("joinOrderRoom", pedido.id);
        });
    }, [pedidos]);

    useEffect(() => {
        socket.on("pedidoActualizado", (pedidoActualizado) => {
            setPedidos((prevPedidos) =>
                prevPedidos.map((pedido) =>
                    pedido.id === pedidoActualizado.id
                        ? pedidoActualizado
                        : pedido
                )
            );

            if (
                pedidoComprobante &&
                pedidoComprobante.id === pedidoActualizado.id
            ) {
                setPedidoComprobante(pedidoActualizado);
            }

            if (
                pedidoSeleccionado &&
                pedidoSeleccionado.id === pedidoActualizado.id
            ) {
                cargarHistorial(pedidoActualizado.id);
            }

            setNotificacion(`Pedido #${pedidoActualizado.id} actualizado`);

            setTimeout(() => {
                setNotificacion("");
            }, 4000);
        });

        return () => {
            socket.off("pedidoActualizado");
        };
    }, [pedidoComprobante, pedidoSeleccionado]);

    useEffect(() => {
        if (!pedidoSeleccionado) return;
        cargarHistorial(pedidoSeleccionado.id);
    }, [pedidoSeleccionado]);

    useEffect(() => {
        if (!pedidoMapa || !pedidoMapa.repartidor_id) return;

        cargarUbicacion(pedidoMapa.repartidor_id);

        const interval = setInterval(() => {
            cargarUbicacion(pedidoMapa.repartidor_id);
        }, 5000);

        return () => clearInterval(interval);
    }, [pedidoMapa]);

    const handleCrearPedido = async (e) => {
        e.preventDefault();

        setMensaje("");
        setError("");
        setNotificacion("");
        setCargando(true);

        try {
            await createOrder({
                tipo_servicio: tipoServicio,
                descripcion,
                direccion,
                total: Number(total)
            });

            setMensaje("Pedido creado correctamente");

            setDescripcion("");
            setDireccion("");
            setTotal("");
            setTipoServicio("restaurante");

            await cargarPedidos();
        } catch (error) {
            setError(
                error.response?.data?.message || "Error al crear pedido"
            );
        } finally {
            setCargando(false);
        }
    };

    const verHistorial = async (pedido) => {
        setPedidoSeleccionado(pedido);
        await cargarHistorial(pedido.id);
    };

    const verMapa = async (pedido) => {
        setPedidoMapa(pedido);
        setUbicacionRepartidor(null);

        if (!pedido.repartidor_id) {
            setError("Este pedido aún no tiene repartidor asignado");
            return;
        }

        await cargarUbicacion(pedido.repartidor_id);
    };

    const handleConfirmarRecepcion = async (pedido, confirmacion) => {
        setMensaje("");
        setError("");

        const comentario = comentariosCliente[pedido.id] || "";

        try {
            await confirmClientReception(
                pedido.id,
                confirmacion,
                comentario
            );

            const pedidoActualizado = {
                ...pedido,
                confirmacion_cliente: confirmacion,
                comentario_cliente: comentario,
                fecha_confirmacion_cliente: new Date().toISOString()
            };

            setPedidoComprobante(pedidoActualizado);

            setPedidos((prevPedidos) =>
                prevPedidos.map((p) =>
                    p.id === pedido.id ? pedidoActualizado : p
                )
            );

            setMensaje("Respuesta enviada correctamente");

            setComentariosCliente({
                ...comentariosCliente,
                [pedido.id]: ""
            });

            await cargarPedidos();
            await cargarHistorial(pedido.id);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al confirmar recepción"
            );
        }
    };

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    const getEstadoBadge = (estado) => {
        if (estado === "pendiente") return "badge bg-secondary";
        if (estado === "aceptado") return "badge bg-primary";
        if (estado === "en camino") return "badge bg-warning text-dark";
        if (estado === "entregado") return "badge bg-success";
        if (estado === "cancelado") return "badge bg-danger";

        return "badge bg-dark";
    };

    const getDiferencia = (diferencia) => {
        if (diferencia === null || diferencia === undefined) {
            return "Pendiente";
        }

        if (Number(diferencia) > 0) {
            return (
                <span className="text-danger fw-bold">
                    + Q {diferencia}
                </span>
            );
        }

        if (Number(diferencia) < 0) {
            return (
                <span className="text-success fw-bold">
                    Q {diferencia}
                </span>
            );
        }

        return (
            <span className="text-secondary fw-bold">
                Q 0.00
            </span>
        );
    };

    return (
        <div className="min-vh-100 bg-light">
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
                <div className="container">
                    <span className="navbar-brand fw-bold">
                        ADOMI Cliente
                    </span>

                    <button
                        className="btn btn-outline-light btn-sm"
                        onClick={cerrarSesion}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </nav>

            <main className="container py-4">
                {notificacion && (
                    <div className="alert alert-info shadow-sm">
                        {notificacion}
                    </div>
                )}

                {mensaje && (
                    <div className="alert alert-success">
                        {mensaje}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                <div className="row g-4">
                    <div className="col-12 col-lg-5">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Crear pedido
                                </h4>

                                <form onSubmit={handleCrearPedido}>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Tipo de servicio
                                        </label>

                                        <select
                                            className="form-select"
                                            value={tipoServicio}
                                            onChange={(e) => setTipoServicio(e.target.value)}
                                        >
                                            <option value="restaurante">
                                                Restaurante
                                            </option>

                                            <option value="supermercado">
                                                Supermercado
                                            </option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="Descripción del pedido"
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="mb-3">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Dirección de entrega"
                                            value={direccion}
                                            onChange={(e) => setDireccion(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <input
                                            type="number"
                                            className="form-control"
                                            placeholder="Total estimado"
                                            value={total}
                                            onChange={(e) => setTotal(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <button
                                        className="btn btn-primary w-100"
                                        disabled={cargando}
                                    >
                                        {cargando ? "Creando..." : "Crear pedido"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Historial
                                </h4>

                                {!pedidoSeleccionado ? (
                                    <p className="text-muted">
                                        Selecciona un pedido para ver su historial.
                                    </p>
                                ) : historial.length === 0 ? (
                                    <p className="text-muted">
                                        Este pedido aún no tiene historial.
                                    </p>
                                ) : (
                                    <ul className="list-group list-group-flush">
                                        {historial.map((item) => (
                                            <li
                                                className="list-group-item"
                                                key={item.id}
                                            >
                                                <div className="d-flex justify-content-between gap-2">
                                                    <span className={getEstadoBadge(item.estado)}>
                                                        {item.estado}
                                                    </span>

                                                    <small className="text-muted">
                                                        {new Date(item.fecha).toLocaleString()}
                                                    </small>
                                                </div>

                                                <p className="mt-2 mb-0">
                                                    {item.comentario}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Ubicación del repartidor
                                </h4>

                                {!pedidoMapa ? (
                                    <p className="text-muted">
                                        Selecciona un pedido con repartidor asignado.
                                    </p>
                                ) : !ubicacionRepartidor ? (
                                    <p className="text-muted">
                                        Ubicación no disponible.
                                    </p>
                                ) : (
                                    <DeliveryMap
                                        latitud={ubicacionRepartidor.latitud}
                                        longitud={ubicacionRepartidor.longitud}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Chat del pedido
                                </h4>

                                {!pedidoChat ? (
                                    <p className="text-muted">
                                        Selecciona un pedido con repartidor asignado para abrir el chat.
                                    </p>
                                ) : (
                                    <>
                                        <p className="fw-semibold">
                                            Pedido #{pedidoChat.id}
                                        </p>

                                        <OrderChat pedidoId={pedidoChat.id} />
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Comprobante de entrega
                                </h4>

                                {!pedidoComprobante ? (
                                    <p className="text-muted">
                                        Selecciona un pedido entregado para ver su comprobante.
                                    </p>
                                ) : pedidoComprobante.estado !== "entregado" ? (
                                    <p className="text-muted">
                                        Este pedido aún no ha sido entregado.
                                    </p>
                                ) : (
                                    <div className="border rounded-4 p-3 bg-light">
                                        <p className="mb-2">
                                            <strong>Pedido:</strong> #{pedidoComprobante.id}
                                        </p>

                                        <p className="mb-2">
                                            <strong>Observación repartidor:</strong>{" "}
                                            {pedidoComprobante.observacion_entrega || "Sin observación"}
                                        </p>

                                        <p className="mb-3">
                                            <strong>Fecha entrega:</strong>{" "}
                                            {pedidoComprobante.fecha_entrega
                                                ? new Date(pedidoComprobante.fecha_entrega).toLocaleString()
                                                : "Sin fecha"}
                                        </p>

                                        {pedidoComprobante.confirmacion_cliente ? (
                                            <div className="alert alert-info mb-0">
                                                <p className="mb-2">
                                                    <strong>Respuesta enviada:</strong>{" "}
                                                    {pedidoComprobante.confirmacion_cliente === "confirmado"
                                                        ? "Pedido recibido correctamente"
                                                        : "Problema reportado"}
                                                </p>

                                                {pedidoComprobante.comentario_cliente && (
                                                    <p className="mb-0">
                                                        <strong>Comentario:</strong>{" "}
                                                        {pedidoComprobante.comentario_cliente}
                                                    </p>
                                                )}

                                                {pedidoComprobante.fecha_confirmacion_cliente && (
                                                    <small className="text-muted">
                                                        {new Date(
                                                            pedidoComprobante.fecha_confirmacion_cliente
                                                        ).toLocaleString()}
                                                    </small>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <textarea
                                                    className="form-control mb-3"
                                                    rows="3"
                                                    placeholder="Comentario opcional o describa el problema"
                                                    value={
                                                        comentariosCliente[pedidoComprobante.id] || ""
                                                    }
                                                    onChange={(e) =>
                                                        setComentariosCliente({
                                                            ...comentariosCliente,
                                                            [pedidoComprobante.id]: e.target.value
                                                        })
                                                    }
                                                ></textarea>

                                                <div className="d-flex flex-column flex-md-row gap-2">
                                                    <button
                                                        className="btn btn-success"
                                                        onClick={() =>
                                                            handleConfirmarRecepcion(
                                                                pedidoComprobante,
                                                                "confirmado"
                                                            )
                                                        }
                                                    >
                                                        Confirmar recibido
                                                    </button>

                                                    <button
                                                        className="btn btn-danger"
                                                        onClick={() =>
                                                            handleConfirmarRecepcion(
                                                                pedidoComprobante,
                                                                "problema"
                                                            )
                                                        }
                                                    >
                                                        Reportar problema
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-7">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">
                                        Mis pedidos
                                    </h4>

                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={cargarPedidos}
                                    >
                                        Actualizar
                                    </button>
                                </div>

                                {pedidos.length === 0 ? (
                                    <p className="text-muted text-center py-4">
                                        Aún no tienes pedidos registrados.
                                    </p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table align-middle">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Servicio</th>
                                                    <th>Estado</th>
                                                    <th>Total</th>
                                                    <th>Real</th>
                                                    <th>Diferencia</th>
                                                    <th>Historial</th>
                                                    <th>Mapa</th>
                                                    <th>Chat</th>
                                                    <th>Comprobante</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {pedidos.map((pedido) => (
                                                    <tr key={pedido.id}>
                                                        <td>#{pedido.id}</td>

                                                        <td className="text-capitalize">
                                                            {pedido.tipo_servicio}
                                                        </td>

                                                        <td>
                                                            <span className={getEstadoBadge(pedido.estado)}>
                                                                {pedido.estado}
                                                            </span>
                                                        </td>

                                                        <td>Q {pedido.total}</td>

                                                        <td>
                                                            {pedido.total_real
                                                                ? `Q ${pedido.total_real}`
                                                                : "Pendiente"}
                                                        </td>

                                                        <td>
                                                            {getDiferencia(pedido.diferencia)}
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => verHistorial(pedido)}
                                                            >
                                                                Ver
                                                            </button>
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-success btn-sm"
                                                                onClick={() => verMapa(pedido)}
                                                                disabled={!pedido.repartidor_id}
                                                            >
                                                                Mapa
                                                            </button>
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-dark btn-sm"
                                                                onClick={() => setPedidoChat(pedido)}
                                                                disabled={!pedido.repartidor_id}
                                                            >
                                                                Chat
                                                            </button>
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-info btn-sm"
                                                                onClick={() => setPedidoComprobante(pedido)}
                                                            >
                                                                Ver
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default ClienteDashboard;
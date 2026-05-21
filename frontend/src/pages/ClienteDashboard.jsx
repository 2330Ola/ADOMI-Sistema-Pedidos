import { useEffect, useState } from "react";

import {
    createOrder,
    getMyOrders,
    getOrderHistory
} from "../services/orderService";

import { getDeliveryLocation } from "../services/locationService";

import DeliveryMap from "../components/DeliveryMap";
import OrderChat from "../components/OrderChat";

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

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [notificacion, setNotificacion] = useState("");
    const [cargando, setCargando] = useState(false);

    const cargarPedidos = async (mostrarNotificaciones = false) => {
        try {
            const data = await getMyOrders();
            const nuevosPedidos = data.pedidos || [];

            if (mostrarNotificaciones && pedidos.length > 0) {
                nuevosPedidos.forEach((nuevoPedido) => {
                    const pedidoAnterior = pedidos.find(
                        (p) => p.id === nuevoPedido.id
                    );

                    if (
                        pedidoAnterior &&
                        pedidoAnterior.estado !== nuevoPedido.estado
                    ) {
                        setNotificacion(
                            `Tu pedido #${nuevoPedido.id} cambió a: ${nuevoPedido.estado}`
                        );

                        setTimeout(() => {
                            setNotificacion("");
                        }, 5000);
                    }

                    if (
                        pedidoAnterior &&
                        pedidoAnterior.total_real !== nuevoPedido.total_real &&
                        nuevoPedido.total_real !== null
                    ) {
                        setNotificacion(
                            `El repartidor confirmó el total real del pedido #${nuevoPedido.id}`
                        );

                        setTimeout(() => {
                            setNotificacion("");
                        }, 5000);
                    }
                });
            }

            setPedidos(nuevosPedidos);

        } catch (error) {
            setError("No se pudieron cargar los pedidos");
        }
    };

    const cargarHistorial = async (pedidoId) => {
        try {
            const data = await getOrderHistory(pedidoId);
            setHistorial(data.historial);
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
        cargarPedidos(false);

        const interval = setInterval(() => {
            cargarPedidos(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [pedidos]);

    useEffect(() => {
        if (!pedidoSeleccionado) return;

        cargarHistorial(pedidoSeleccionado.id);

        const interval = setInterval(() => {
            cargarHistorial(pedidoSeleccionado.id);
        }, 5000);

        return () => clearInterval(interval);
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

            cargarPedidos(false);

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

        if (!pedido.repartidor_id) {
            setError("Este pedido aún no tiene repartidor asignado");
            return;
        }

        await cargarUbicacion(pedido.repartidor_id);
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
                                            placeholder="Descripción"
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="mb-3">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Dirección"
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
                                        Selecciona un pedido.
                                    </p>
                                ) : (
                                    <ul className="list-group list-group-flush">
                                        {historial.map((item) => (
                                            <li
                                                className="list-group-item"
                                                key={item.id}
                                            >
                                                <div className="d-flex justify-content-between">
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
                                        Selecciona un pedido.
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
                                        Selecciona un pedido para abrir el chat.
                                    </p>
                                ) : (
                                    <OrderChat pedidoId={pedidoChat.id} />
                                )}

                            </div>
                        </div>

                    </div>

                    <div className="col-12 col-lg-7">

                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">

                                <h4 className="fw-bold mb-3">
                                    Mis pedidos
                                </h4>

                                <div className="table-responsive">
                                    <table className="table align-middle">

                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Estado</th>
                                                <th>Total</th>
                                                <th>Real</th>
                                                <th>Diferencia</th>
                                                <th>Historial</th>
                                                <th>Mapa</th>
                                                <th>Chat</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pedidos.map((pedido) => (
                                                <tr key={pedido.id}>

                                                    <td>
                                                        #{pedido.id}
                                                    </td>

                                                    <td>
                                                        <span className={getEstadoBadge(pedido.estado)}>
                                                            {pedido.estado}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        Q {pedido.total}
                                                    </td>

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

                                                </tr>
                                            ))}
                                        </tbody>

                                    </table>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>

            </main>

        </div>
    );
}

export default ClienteDashboard;
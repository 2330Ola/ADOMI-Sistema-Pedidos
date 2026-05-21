import { useEffect, useState } from "react";

import {
    getPendingOrders,
    getMyDeliveries,
    acceptOrder,
    updateOrderStatus,
    confirmRealTotal
} from "../services/orderService";

import { updateMyLocation } from "../services/locationService";
import OrderChat from "../components/OrderChat";

function RepartidorDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [pendientes, setPendientes] = useState([]);
    const [entregas, setEntregas] = useState([]);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [notificacion, setNotificacion] = useState("");
    const [totalesReales, setTotalesReales] = useState({});
    const [pedidoChat, setPedidoChat] = useState(null);

    const [ubicacionActiva, setUbicacionActiva] = useState(false);
    const [ubicacionMensaje, setUbicacionMensaje] = useState("");

    const cargarDatos = async (mostrarNotificacion = false) => {
        try {
            const pendientesData = await getPendingOrders();
            const entregasData = await getMyDeliveries();

            const nuevosPendientes = pendientesData.pedidos || [];

            if (mostrarNotificacion && pendientes.length > 0) {
                nuevosPendientes.forEach((pedidoNuevo) => {
                    const existeAntes = pendientes.find(
                        (pedidoAnterior) => pedidoAnterior.id === pedidoNuevo.id
                    );

                    if (!existeAntes) {
                        setNotificacion(`Nuevo pedido disponible #${pedidoNuevo.id}`);

                        setTimeout(() => {
                            setNotificacion("");
                        }, 5000);
                    }
                });
            }

            setPendientes(nuevosPendientes);
            setEntregas(entregasData.pedidos || []);
        } catch (error) {
            setError("No se pudieron cargar los pedidos");
        }
    };

    useEffect(() => {
        cargarDatos(false);

        const interval = setInterval(() => {
            cargarDatos(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [pendientes]);

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    const limpiarMensajes = () => {
        setMensaje("");
        setError("");
        setUbicacionMensaje("");
    };

    const compartirUbicacion = () => {
        limpiarMensajes();

        if (!navigator.geolocation) {
            setError("Tu navegador no permite geolocalización");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latitud = position.coords.latitude;
                const longitud = position.coords.longitude;

                try {
                    await updateMyLocation(latitud, longitud);
                    setUbicacionActiva(true);
                    setUbicacionMensaje("Ubicación compartida correctamente");
                } catch (error) {
                    setError("No se pudo guardar la ubicación");
                }
            },
            () => {
                setError("No se pudo obtener la ubicación. Verifica permisos del navegador.");
            }
        );
    };

    const handleAceptar = async (id) => {
        limpiarMensajes();

        try {
            await acceptOrder(id);
            setMensaje("Pedido aceptado correctamente");
            cargarDatos(false);
        } catch (error) {
            setError(error.response?.data?.message || "Error al aceptar pedido");
        }
    };

    const handleCambiarEstado = async (id, estado) => {
        limpiarMensajes();

        try {
            await updateOrderStatus(id, estado);
            setMensaje("Estado actualizado correctamente");
            cargarDatos(false);
        } catch (error) {
            setError(error.response?.data?.message || "Error al cambiar estado");
        }
    };

    const handleConfirmarTotal = async (pedido) => {
        limpiarMensajes();

        const totalReal = totalesReales[pedido.id];

        if (!totalReal) {
            setError("Ingrese el total real del pedido");
            return;
        }

        try {
            const data = await confirmRealTotal(
                pedido.id,
                totalReal,
                pedido.total
            );

            setMensaje(`Total real confirmado. Diferencia: Q ${data.diferencia}`);

            setTotalesReales({
                ...totalesReales,
                [pedido.id]: ""
            });

            cargarDatos(false);
        } catch (error) {
            setError(error.response?.data?.message || "Error al confirmar total");
        }
    };

    const getEstadoBadge = (estado) => {
        if (estado === "pendiente") return "badge bg-secondary";
        if (estado === "aceptado") return "badge bg-primary";
        if (estado === "en camino") return "badge bg-warning text-dark";
        if (estado === "entregado") return "badge bg-success";
        if (estado === "cancelado") return "badge bg-danger";

        return "badge bg-dark";
    };

    const pedidoBloqueado = (pedido) => {
        return pedido.estado === "entregado" || pedido.estado === "cancelado";
    };

    return (
        <div className="min-vh-100 bg-light">

            <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
                <div className="container">
                    <span className="navbar-brand fw-bold">
                        ADOMI Repartidor
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

                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-4">
                        <h2 className="fw-bold mb-1">
                            Panel del Repartidor
                        </h2>

                        <p className="text-muted mb-0">
                            Acepta pedidos, actualiza estados, confirma el total real y comunícate con el cliente.
                        </p>

                        <div className="mt-3 d-flex flex-wrap gap-2">
                            <span className="badge bg-secondary fs-6">
                                Pendientes: {pendientes.length}
                            </span>

                            <span className="badge bg-primary fs-6">
                                Mis entregas: {entregas.length}
                            </span>
                        </div>

                        <div className="mt-3">
                            <button
                                className={
                                    ubicacionActiva
                                        ? "btn btn-success"
                                        : "btn btn-outline-success"
                                }
                                onClick={compartirUbicacion}
                            >
                                {ubicacionActiva
                                    ? "Ubicación compartida"
                                    : "Compartir ubicación"}
                            </button>

                            {ubicacionMensaje && (
                                <small className="d-block text-success mt-2">
                                    {ubicacionMensaje}
                                </small>
                            )}
                        </div>
                    </div>
                </div>

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

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">
                                        Pendientes
                                        <span className="badge bg-danger ms-2">
                                            {pendientes.length}
                                        </span>
                                    </h4>

                                    <button
                                        className="btn btn-outline-dark btn-sm"
                                        onClick={() => cargarDatos(false)}
                                    >
                                        Actualizar
                                    </button>
                                </div>

                                {pendientes.length === 0 ? (
                                    <p className="text-muted text-center py-4">
                                        No hay pedidos pendientes.
                                    </p>
                                ) : (
                                    pendientes.map((pedido) => (
                                        <div
                                            className="border rounded-3 p-3 mb-2 bg-white"
                                            key={pedido.id}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="fw-bold mb-1">
                                                        #{pedido.id} - {pedido.cliente_nombre}
                                                    </h6>

                                                    <small className="text-muted">
                                                        {pedido.tipo_servicio} | Q {pedido.total}
                                                    </small>
                                                </div>

                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() => handleAceptar(pedido.id)}
                                                >
                                                    Aceptar
                                                </button>
                                            </div>

                                            <p className="mb-1 mt-2">
                                                <strong>Pedido:</strong> {pedido.descripcion}
                                            </p>

                                            <p className="mb-0">
                                                <strong>Dirección:</strong> {pedido.direccion}
                                            </p>
                                        </div>
                                    ))
                                )}

                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Chat del pedido
                                </h4>

                                {!pedidoChat ? (
                                    <p className="text-muted mb-0">
                                        Selecciona una entrega para abrir el chat.
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
                    </div>

                    <div className="col-12 col-lg-7">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">
                                        Mis entregas
                                    </h4>

                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => cargarDatos(false)}
                                    >
                                        Actualizar
                                    </button>
                                </div>

                                {entregas.length === 0 ? (
                                    <p className="text-muted text-center py-4">
                                        Aún no tienes entregas asignadas.
                                    </p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table align-middle">
                                            <thead>
                                                <tr>
                                                    <th>Pedido</th>
                                                    <th>Cliente</th>
                                                    <th>Estado</th>
                                                    <th>Estimado</th>
                                                    <th>Real</th>
                                                    <th>Acción</th>
                                                    <th>Chat</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {entregas.map((pedido) => (
                                                    <tr key={pedido.id}>
                                                        <td>
                                                            <strong>#{pedido.id}</strong>
                                                            <br />
                                                            <small className="text-muted">
                                                                {pedido.descripcion}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            {pedido.cliente_nombre}
                                                            <br />
                                                            <small className="text-muted">
                                                                {pedido.direccion}
                                                            </small>
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

                                                        <td style={{ minWidth: "280px" }}>
                                                            <div className="d-flex gap-2 flex-column flex-md-row">
                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    value={pedido.estado}
                                                                    disabled={pedidoBloqueado(pedido)}
                                                                    onChange={(e) =>
                                                                        handleCambiarEstado(
                                                                            pedido.id,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="aceptado">
                                                                        Aceptado
                                                                    </option>
                                                                    <option value="en camino">
                                                                        En camino
                                                                    </option>
                                                                    <option value="entregado">
                                                                        Entregado
                                                                    </option>
                                                                    <option value="cancelado">
                                                                        Cancelado
                                                                    </option>
                                                                </select>

                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm"
                                                                    placeholder="Total real"
                                                                    disabled={
                                                                        pedidoBloqueado(pedido) ||
                                                                        pedido.total_real !== null
                                                                    }
                                                                    value={totalesReales[pedido.id] || ""}
                                                                    onChange={(e) =>
                                                                        setTotalesReales({
                                                                            ...totalesReales,
                                                                            [pedido.id]: e.target.value
                                                                        })
                                                                    }
                                                                />

                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    disabled={
                                                                        pedidoBloqueado(pedido) ||
                                                                        pedido.total_real !== null
                                                                    }
                                                                    onClick={() => handleConfirmarTotal(pedido)}
                                                                >
                                                                    OK
                                                                </button>
                                                            </div>

                                                            {pedidoBloqueado(pedido) && (
                                                                <small className="text-muted">
                                                                    Pedido finalizado, no editable.
                                                                </small>
                                                            )}

                                                            {pedido.total_real !== null &&
                                                                !pedidoBloqueado(pedido) && (
                                                                    <small className="text-muted">
                                                                        Total ya confirmado.
                                                                    </small>
                                                                )}
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-dark btn-sm"
                                                                onClick={() => setPedidoChat(pedido)}
                                                            >
                                                                Chat
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

export default RepartidorDashboard;
import { useEffect, useState } from "react";

import {
    getPendingOrders,
    getMyDeliveries,
    acceptOrder,
    updateOrderStatus,
    confirmRealTotal,
    confirmDelivery
} from "../services/orderService";

import { updateMyLocation } from "../services/locationService";
import OrderChat from "../components/OrderChat";
import socket from "../socket";

function RepartidorDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [vista, setVista] = useState("pendientes");

    const [pendientes, setPendientes] = useState([]);
    const [entregas, setEntregas] = useState([]);

    const [entregaSeleccionada, setEntregaSeleccionada] = useState(null);
    const [historialSeleccionado, setHistorialSeleccionado] = useState(null);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [notificacion, setNotificacion] = useState("");

    const [totalesReales, setTotalesReales] = useState({});
    const [observacionesEntrega, setObservacionesEntrega] = useState({});

    const [ubicacionActiva, setUbicacionActiva] = useState(false);
    const [ubicacionMensaje, setUbicacionMensaje] = useState("");

    const entregasActivas = entregas.filter(
        (pedido) =>
            pedido.estado !== "entregado" &&
            pedido.estado !== "cancelado"
    );

    const entregasFinalizadas = entregas.filter(
        (pedido) =>
            pedido.estado === "entregado" ||
            pedido.estado === "cancelado"
    );

    const cargarDatos = async () => {
        try {
            const pendientesData = await getPendingOrders();
            const entregasData = await getMyDeliveries();

            const pedidosPendientes = pendientesData.pedidos || [];
            const pedidosEntregas = entregasData.pedidos || [];

            setPendientes(pedidosPendientes);
            setEntregas(pedidosEntregas);

            if (entregaSeleccionada) {
                const actualizada = pedidosEntregas.find(
                    (pedido) => pedido.id === entregaSeleccionada.id
                );

                if (actualizada) {
                    setEntregaSeleccionada(actualizada);
                }
            }

            if (historialSeleccionado) {
                const actualizada = pedidosEntregas.find(
                    (pedido) => pedido.id === historialSeleccionado.id
                );

                if (actualizada) {
                    setHistorialSeleccionado(actualizada);
                }
            }

        } catch (error) {
            setError("No se pudieron cargar los pedidos");
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        entregas.forEach((pedido) => {
            socket.emit("joinOrderRoom", pedido.id);
        });
    }, [entregas]);

    useEffect(() => {
        socket.on("pedidoActualizado", (pedidoActualizado) => {
            setEntregas((prevEntregas) =>
                prevEntregas.map((pedido) =>
                    pedido.id === pedidoActualizado.id
                        ? { ...pedido, ...pedidoActualizado }
                        : pedido
                )
            );

            if (
                entregaSeleccionada &&
                entregaSeleccionada.id === pedidoActualizado.id
            ) {
                setEntregaSeleccionada({
                    ...entregaSeleccionada,
                    ...pedidoActualizado
                });
            }

            if (
                historialSeleccionado &&
                historialSeleccionado.id === pedidoActualizado.id
            ) {
                setHistorialSeleccionado({
                    ...historialSeleccionado,
                    ...pedidoActualizado
                });
            }

            setNotificacion(`Pedido #${pedidoActualizado.id} actualizado`);

            setTimeout(() => {
                setNotificacion("");
            }, 4000);
        });

        return () => {
            socket.off("pedidoActualizado");
        };
    }, [entregaSeleccionada, historialSeleccionado]);

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

            await cargarDatos();

            setVista("activa");

        } catch (error) {
            setError(error.response?.data?.message || "Error al aceptar pedido");
        }
    };

    const handleCambiarEstado = async (pedido, estado) => {
        limpiarMensajes();

        try {
            await updateOrderStatus(pedido.id, estado);

            const pedidoActualizado = {
                ...pedido,
                estado
            };

            setEntregaSeleccionada(pedidoActualizado);

            setEntregas((prevEntregas) =>
                prevEntregas.map((item) =>
                    item.id === pedido.id ? pedidoActualizado : item
                )
            );

            setMensaje("Estado actualizado correctamente");

            await cargarDatos();

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

            const pedidoActualizado = {
                ...pedido,
                total_real: Number(totalReal),
                diferencia: data.diferencia
            };

            setEntregaSeleccionada(pedidoActualizado);

            setEntregas((prevEntregas) =>
                prevEntregas.map((item) =>
                    item.id === pedido.id ? pedidoActualizado : item
                )
            );

            setMensaje(`Total real confirmado. Diferencia: Q ${data.diferencia}`);

            setTotalesReales({
                ...totalesReales,
                [pedido.id]: ""
            });

            await cargarDatos();

        } catch (error) {
            setError(error.response?.data?.message || "Error al confirmar total");
        }
    };

    const handleConfirmarEntrega = async (pedido) => {
        limpiarMensajes();

        const observacion = observacionesEntrega[pedido.id];

        if (!observacion || !observacion.trim()) {
            setError("Ingrese una observación de entrega");
            return;
        }

        try {
            await confirmDelivery(pedido.id, observacion);

            const pedidoActualizado = {
                ...pedido,
                estado: "entregado",
                observacion_entrega: observacion,
                fecha_entrega: new Date().toISOString()
            };

            setEntregaSeleccionada(null);
            setHistorialSeleccionado(pedidoActualizado);

            setEntregas((prevEntregas) =>
                prevEntregas.map((item) =>
                    item.id === pedido.id ? pedidoActualizado : item
                )
            );

            setMensaje("Entrega confirmada correctamente");

            setObservacionesEntrega({
                ...observacionesEntrega,
                [pedido.id]: ""
            });

            await cargarDatos();

            setVista("historial");

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al confirmar entrega"
            );
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

    const getConfirmacionCliente = (pedido) => {
        if (pedido.confirmacion_cliente === "confirmado") {
            return (
                <span className="badge bg-success">
                    Cliente confirmó recibido
                </span>
            );
        }

        if (pedido.confirmacion_cliente === "problema") {
            return (
                <span className="badge bg-danger">
                    Cliente reportó problema
                </span>
            );
        }

        return (
            <span className="badge bg-secondary">
                Pendiente de cliente
            </span>
        );
    };

    return (
        <div className="min-vh-100 bg-light">

            <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
                <div className="container-fluid px-4">
                    <span className="navbar-brand fw-bold">
                        <i className="bi bi-truck me-2"></i>
                        ADOMI Repartidor
                    </span>

                    <div className="d-flex align-items-center gap-3">
                        <span className="text-white d-none d-md-block">
                            {user?.nombre}
                        </span>

                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={cerrarSesion}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container-fluid px-4 py-4">

                {notificacion && (
                    <div className="alert alert-info shadow-sm">
                        <i className="bi bi-bell me-2"></i>
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

                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-4">
                        <h2 className="fw-bold mb-1">
                            Panel del Repartidor
                        </h2>

                        <p className="text-muted mb-0">
                            Acepta pedidos, gestiona tu entrega actual y revisa tus entregas finalizadas.
                        </p>

                        <div className="mt-3 d-flex flex-wrap gap-2">
                            <span className="badge bg-secondary fs-6">
                                Pendientes: {pendientes.length}
                            </span>

                            <span className="badge bg-primary fs-6">
                                Activas: {entregasActivas.length}
                            </span>

                            <span className="badge bg-success fs-6">
                                Finalizadas: {entregasFinalizadas.length}
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
                                <i className="bi bi-geo-alt me-2"></i>
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

                <div className="row g-3 mb-4">

                    <div className="col-12 col-md-4">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "pendientes" ? "border border-warning" : ""
                            }`}
                            onClick={() => setVista("pendientes")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-warning mb-2">
                                    <i className="bi bi-hourglass-split"></i>
                                </div>

                                <h5 className="fw-bold">
                                    Pedidos pendientes
                                </h5>

                                <p className="text-muted mb-0">
                                    {pendientes.length} pedido(s) disponibles.
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-4">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "activa" ? "border border-primary" : ""
                            }`}
                            onClick={() => setVista("activa")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-primary mb-2">
                                    <i className="bi bi-truck"></i>
                                </div>

                                <h5 className="fw-bold">
                                    Entrega activa
                                </h5>

                                <p className="text-muted mb-0">
                                    {entregasActivas.length} entrega(s) en proceso.
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-4">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "historial" ? "border border-success" : ""
                            }`}
                            onClick={() => setVista("historial")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-success mb-2">
                                    <i className="bi bi-check-circle"></i>
                                </div>

                                <h5 className="fw-bold">
                                    Historial
                                </h5>

                                <p className="text-muted mb-0">
                                    {entregasFinalizadas.length} entrega(s) finalizadas.
                                </p>
                            </div>
                        </button>
                    </div>

                </div>

                {vista === "pendientes" && (
                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="fw-bold mb-0">
                                    Pedidos disponibles
                                </h4>

                                <button
                                    className="btn btn-outline-dark btn-sm"
                                    onClick={cargarDatos}
                                >
                                    Actualizar
                                </button>
                            </div>

                            {pendientes.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-inbox fs-1 text-muted"></i>

                                    <p className="text-muted mt-3 mb-0">
                                        No hay pedidos pendientes.
                                    </p>
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {pendientes.map((pedido) => (
                                        <div
                                            className="col-12 col-lg-6 col-xl-4"
                                            key={pedido.id}
                                        >
                                            <div className="card border-0 shadow-sm rounded-4 h-100">
                                                <div className="card-body p-4">
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div>
                                                            <h5 className="fw-bold mb-1">
                                                                Pedido #{pedido.id}
                                                            </h5>

                                                            <p className="text-muted mb-0">
                                                                {pedido.cliente_nombre}
                                                            </p>
                                                        </div>

                                                        <span className={getEstadoBadge(pedido.estado)}>
                                                            {pedido.estado}
                                                        </span>
                                                    </div>

                                                    <p className="mb-2">
                                                        <strong>Servicio:</strong>{" "}
                                                        <span className="text-capitalize">
                                                            {pedido.tipo_servicio}
                                                        </span>
                                                    </p>

                                                    <p className="mb-2">
                                                        <strong>Pedido:</strong> {pedido.descripcion}
                                                    </p>

                                                    <p className="mb-2">
                                                        <strong>Dirección:</strong> {pedido.direccion}
                                                    </p>

                                                    <p className="mb-3">
                                                        <strong>Total estimado:</strong> Q {pedido.total}
                                                    </p>

                                                    <button
                                                        className="btn btn-success w-100"
                                                        onClick={() => handleAceptar(pedido.id)}
                                                    >
                                                        Aceptar pedido
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {vista === "activa" && (
                    <div className="row g-4">

                        <div className="col-12 col-xl-5">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h4 className="fw-bold mb-0">
                                            Mis entregas activas
                                        </h4>

                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={cargarDatos}
                                        >
                                            Actualizar
                                        </button>
                                    </div>

                                    {entregasActivas.length === 0 ? (
                                        <p className="text-muted text-center py-4">
                                            No tienes entregas activas.
                                        </p>
                                    ) : (
                                        entregasActivas.map((pedido) => (
                                            <button
                                                key={pedido.id}
                                                className={`card w-100 text-start border-0 shadow-sm rounded-4 mb-3 ${
                                                    entregaSeleccionada?.id === pedido.id
                                                        ? "border border-primary"
                                                        : ""
                                                }`}
                                                onClick={() => setEntregaSeleccionada(pedido)}
                                            >
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <h5 className="fw-bold mb-1">
                                                                Pedido #{pedido.id}
                                                            </h5>

                                                            <p className="text-muted mb-1">
                                                                {pedido.cliente_nombre}
                                                            </p>
                                                        </div>

                                                        <span className={getEstadoBadge(pedido.estado)}>
                                                            {pedido.estado}
                                                        </span>
                                                    </div>

                                                    <p className="mb-2">
                                                        {pedido.descripcion}
                                                    </p>

                                                    <small className="text-muted">
                                                        Total estimado: Q {pedido.total}
                                                    </small>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-7">
                            {!entregaSeleccionada ? (
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-5 text-center">
                                        <i className="bi bi-truck fs-1 text-muted"></i>

                                        <p className="text-muted mt-3 mb-0">
                                            Selecciona una entrega activa para gestionarla.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div>
                                                    <h4 className="fw-bold mb-1">
                                                        Pedido #{entregaSeleccionada.id}
                                                    </h4>

                                                    <p className="text-muted mb-0">
                                                        Cliente: {entregaSeleccionada.cliente_nombre}
                                                    </p>
                                                </div>

                                                <span className={getEstadoBadge(entregaSeleccionada.estado)}>
                                                    {entregaSeleccionada.estado}
                                                </span>
                                            </div>

                                            <p>
                                                <strong>Pedido:</strong> {entregaSeleccionada.descripcion}
                                            </p>

                                            <p>
                                                <strong>Dirección:</strong> {entregaSeleccionada.direccion}
                                            </p>

                                            <div className="row g-3 mb-4">
                                                <div className="col-12 col-md-4">
                                                    <div className="bg-light rounded-4 p-3">
                                                        <small className="text-muted">
                                                            Estimado
                                                        </small>

                                                        <h5 className="fw-bold mb-0">
                                                            Q {entregaSeleccionada.total}
                                                        </h5>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md-4">
                                                    <div className="bg-light rounded-4 p-3">
                                                        <small className="text-muted">
                                                            Real
                                                        </small>

                                                        <h5 className="fw-bold mb-0">
                                                            {entregaSeleccionada.total_real
                                                                ? `Q ${entregaSeleccionada.total_real}`
                                                                : "Pendiente"}
                                                        </h5>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md-4">
                                                    <div className="bg-light rounded-4 p-3">
                                                        <small className="text-muted">
                                                            Diferencia
                                                        </small>

                                                        <h5 className="fw-bold mb-0">
                                                            {entregaSeleccionada.diferencia ?? "Pendiente"}
                                                        </h5>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label fw-semibold">
                                                    Estado del pedido
                                                </label>

                                                <select
                                                    className="form-select"
                                                    value={entregaSeleccionada.estado}
                                                    disabled={pedidoBloqueado(entregaSeleccionada)}
                                                    onChange={(e) =>
                                                        handleCambiarEstado(
                                                            entregaSeleccionada,
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

                                                    <option value="cancelado">
                                                        Cancelado
                                                    </option>
                                                </select>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label fw-semibold">
                                                    Total real
                                                </label>

                                                <div className="input-group">
                                                    <span className="input-group-text">
                                                        Q
                                                    </span>

                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        placeholder="Total real"
                                                        disabled={
                                                            pedidoBloqueado(entregaSeleccionada) ||
                                                            entregaSeleccionada.total_real !== null
                                                        }
                                                        value={totalesReales[entregaSeleccionada.id] || ""}
                                                        onChange={(e) =>
                                                            setTotalesReales({
                                                                ...totalesReales,
                                                                [entregaSeleccionada.id]: e.target.value
                                                            })
                                                        }
                                                    />

                                                    <button
                                                        className="btn btn-primary"
                                                        disabled={
                                                            pedidoBloqueado(entregaSeleccionada) ||
                                                            entregaSeleccionada.total_real !== null
                                                        }
                                                        onClick={() => handleConfirmarTotal(entregaSeleccionada)}
                                                    >
                                                        Confirmar
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <label className="form-label fw-semibold">
                                                    Observación de entrega
                                                </label>

                                                <textarea
                                                    className="form-control"
                                                    rows="3"
                                                    placeholder="Ejemplo: Entregado al cliente en la puerta principal"
                                                    disabled={pedidoBloqueado(entregaSeleccionada)}
                                                    value={observacionesEntrega[entregaSeleccionada.id] || ""}
                                                    onChange={(e) =>
                                                        setObservacionesEntrega({
                                                            ...observacionesEntrega,
                                                            [entregaSeleccionada.id]: e.target.value
                                                        })
                                                    }
                                                ></textarea>
                                            </div>

                                            <button
                                                className="btn btn-success w-100"
                                                disabled={pedidoBloqueado(entregaSeleccionada)}
                                                onClick={() => handleConfirmarEntrega(entregaSeleccionada)}
                                            >
                                                Confirmar entrega
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card border-0 shadow-sm rounded-4">
                                        <div className="card-body p-4">
                                            <h4 className="fw-bold mb-3">
                                                Chat con cliente
                                            </h4>

                                            <OrderChat pedidoId={entregaSeleccionada.id} />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                )}

                {vista === "historial" && (
                    <div className="row g-4">

                        <div className="col-12 col-xl-5">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <h4 className="fw-bold mb-3">
                                        Entregas finalizadas
                                    </h4>

                                    {entregasFinalizadas.length === 0 ? (
                                        <p className="text-muted text-center py-4">
                                            Aún no tienes entregas finalizadas.
                                        </p>
                                    ) : (
                                        entregasFinalizadas.map((pedido) => (
                                            <button
                                                key={pedido.id}
                                                className={`card w-100 text-start border-0 shadow-sm rounded-4 mb-3 ${
                                                    historialSeleccionado?.id === pedido.id
                                                        ? "border border-success"
                                                        : ""
                                                }`}
                                                onClick={() => setHistorialSeleccionado(pedido)}
                                            >
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <h5 className="fw-bold mb-1">
                                                                Pedido #{pedido.id}
                                                            </h5>

                                                            <p className="text-muted mb-1">
                                                                {pedido.cliente_nombre}
                                                            </p>
                                                        </div>

                                                        <span className={getEstadoBadge(pedido.estado)}>
                                                            {pedido.estado}
                                                        </span>
                                                    </div>

                                                    <small className="text-muted">
                                                        Total: Q {pedido.total_real || pedido.total}
                                                    </small>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-7">
                            {!historialSeleccionado ? (
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-5 text-center">
                                        <i className="bi bi-receipt fs-1 text-muted"></i>

                                        <p className="text-muted mt-3 mb-0">
                                            Selecciona una entrega finalizada para ver detalles.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-4">
                                        <h4 className="fw-bold mb-3">
                                            Detalle de entrega
                                        </h4>

                                        <p>
                                            <strong>Pedido:</strong> #{historialSeleccionado.id}
                                        </p>

                                        <p>
                                            <strong>Cliente:</strong> {historialSeleccionado.cliente_nombre}
                                        </p>

                                        <p>
                                            <strong>Estado:</strong>{" "}
                                            <span className={getEstadoBadge(historialSeleccionado.estado)}>
                                                {historialSeleccionado.estado}
                                            </span>
                                        </p>

                                        <p>
                                            <strong>Observación entrega:</strong>{" "}
                                            {historialSeleccionado.observacion_entrega || "Sin observación"}
                                        </p>

                                        <p>
                                            <strong>Fecha entrega:</strong>{" "}
                                            {historialSeleccionado.fecha_entrega
                                                ? new Date(historialSeleccionado.fecha_entrega).toLocaleString()
                                                : "Sin fecha"}
                                        </p>

                                        <p>
                                            <strong>Confirmación cliente:</strong>{" "}
                                            {getConfirmacionCliente(historialSeleccionado)}
                                        </p>

                                        {historialSeleccionado.comentario_cliente && (
                                            <p>
                                                <strong>Comentario cliente:</strong>{" "}
                                                {historialSeleccionado.comentario_cliente}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </main>

        </div>
    );
}

export default RepartidorDashboard;
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
        return <Navigate to="/" replace />;
    }

    let user;

    try {
        user = JSON.parse(userData);
    } catch (error) {
        localStorage.clear();
        return <Navigate to="/" replace />;
    }

    if (!user.rol) {
        localStorage.clear();
        return <Navigate to="/" replace />;
    }

    if (user.rol !== allowedRole) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiFetch } from "../utils/auth";

export default function ProtectedRoute() {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await apiFetch("/auth/me");
                if (!res.ok) {
                    setAuthenticated(false);
                    return;
                }
                setAuthenticated(true);
            } catch (err) {
                console.error(err);
                setAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    if (loading) return <div>Loading...</div>;

    return authenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
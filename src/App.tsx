import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Suppliers } from "./pages/Suppliers";
import { Orders } from "./pages/Orders";
import { Divisions } from "./pages/Divisions";
import { ProductCategories } from "./pages/ProductCategories";
import { Products } from "./pages/Products";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";
import { AuditLogs } from "./pages/AuditLogs";

import { Dispatches } from "./pages/Dispatches";
import { AuthProvider, useAuth } from "./context/AuthContext";

import { navItems, hasAccess, type AppRole } from "./config/navigation";

/* ================================
   PROTECTED ROUTE COMPONENT
================================ */

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}) => {
  const { isAuthenticated, user } = useAuth();

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role restriction
  if (allowedRoles && !hasAccess(user?.role, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/* ================================
   ROUTE COMPONENT MAP
================================ */

const routeComponents: Record<string, React.ReactNode> = {
  "/dashboard": <Dashboard />,
  "/suppliers": <Suppliers />,
  "/divisions": <Divisions />,
  "/product-categories": <ProductCategories />,
  "/products": <Products />,
  "/orders": <Orders />,
  "/dispatches": <Dispatches />,
  "/users": <UserManagement />,
  "/audit-logs": <AuditLogs />,
};

/* ================================
   APP COMPONENT
================================ */

export default function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <Notifications />
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Default Redirect */}
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* Dynamic Protected Routes */}
              {navItems.map((route) => (
                <Route
                  key={route.to}
                  path={route.to.replace("/", "")}
                  element={
                    <ProtectedRoute allowedRoles={route.roles}>
                      {routeComponents[route.to]}
                    </ProtectedRoute>
                  }
                />
              ))}

              {/* Inventory (Authenticated Only, No Role Restriction) */}
              {/* <Route
                path="inventory"
                element={
                  <ProtectedRoute>
                    <Inventory />
                  </ProtectedRoute>
                }
              /> */}
            </Route>

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  );
}

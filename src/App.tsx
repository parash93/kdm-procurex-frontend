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

import { AuthProvider, useAuth } from "./context/AuthContext";

/* ================================
   ROLE ACCESS CONFIGURATION
================================ */

const roleAccess = [
  { label: "Dashboard", to: "/dashboard", roles: ["ADMIN", "OPERATIONS", "SALES_MANAGER"] },
  { label: "Suppliers", to: "/suppliers", roles: ["ADMIN", "OPERATIONS"] },
  { label: "Divisions", to: "/divisions", roles: ["ADMIN", "OPERATIONS"] },
  { label: "Product Categories", to: "/product-categories", roles: ["ADMIN", "OPERATIONS"] },
  { label: "Products", to: "/products", roles: ["ADMIN", "OPERATIONS"] },
  { label: "Orders", to: "/orders", roles: ["ADMIN", "OPERATIONS", "SALES_MANAGER"] },
  { label: "Users", to: "/users", roles: ["ADMIN"] },
];

/* ================================
   PROTECTED ROUTE COMPONENT
================================ */

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const { isAuthenticated, user } = useAuth();

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role restriction (ADMIN override enabled)
  if (
    allowedRoles &&
    user?.role !== "ADMIN" &&
    !allowedRoles.includes(user?.role as string)
  ) {
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
  "/users": <UserManagement />,
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
              {roleAccess.map((route) => (
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

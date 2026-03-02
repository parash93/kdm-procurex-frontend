import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider, createTheme } from "@mantine/core";
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
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import { navItems, hasAccess, type AppRole } from "./config/navigation";

/* ================================
   CUSTOM MANTINE THEME
================================ */

const theme = createTheme({
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', 'Fira Code', monospace",
  headings: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '800',
  },
  primaryColor: 'blue',
  defaultRadius: 'md',
  colors: {
    // Richer blues for the light theme
    blue: [
      '#eff6ff', // 0 - lightest
      '#dbeafe', // 1
      '#bfdbfe', // 2
      '#93c5fd', // 3
      '#60a5fa', // 4
      '#3b82f6', // 5
      '#2563eb', // 6 - primary
      '#1d4ed8', // 7
      '#1e40af', // 8
      '#1e3a8a', // 9 - darkest
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
});

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
   INNER APP (reads theme from context)
================================ */

function AppWithTheme() {
  const { colorScheme } = useTheme();

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme} forceColorScheme={colorScheme}>
      <Notifications position="top-right" />
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
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  );
}

/* ================================
   ROOT APP COMPONENT
================================ */

export default function App() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}

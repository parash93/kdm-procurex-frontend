import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Suppliers } from "./pages/Suppliers";
import { Orders } from "./pages/Orders";
import { Divisions } from "./pages/Divisions";
import { ProductCategories } from "./pages/ProductCategories";
import { Products } from "./pages/Products";

export default function App() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="divisions" element={<Divisions />} />
            <Route path="product-categories" element={<ProductCategories />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

import {
    IconDashboard,
    IconTruck,
    IconShoppingCart,
    IconBuildingSkyscraper,
    IconCategory,
    IconPackage,
    IconUsers,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";

/* ================================
   ROLE DEFINITIONS
================================ */

export type AppRole = "ADMIN" | "OPERATIONS" | "SALES_MANAGER";

/* ================================
   NAVIGATION / ROUTE CONFIG
================================ */

export interface NavItem {
    icon: Icon;
    label: string;
    to: string;
    roles: AppRole[];
}

/**
 * Single source of truth for navigation links AND route-level role access.
 * Used by both Layout (sidebar) and App (route protection).
 *
 * To add a new page:
 *   1. Add an entry here
 *   2. Add the component mapping in App.tsx → routeComponents
 */
export const navItems: NavItem[] = [
    { icon: IconDashboard, label: "Dashboard", to: "/dashboard", roles: ["ADMIN", "OPERATIONS", "SALES_MANAGER"] },
    { icon: IconTruck, label: "Suppliers", to: "/suppliers", roles: ["ADMIN", "OPERATIONS"] },
    { icon: IconBuildingSkyscraper, label: "Divisions", to: "/divisions", roles: ["ADMIN", "OPERATIONS"] },
    { icon: IconCategory, label: "Product Categories", to: "/product-categories", roles: ["ADMIN", "OPERATIONS"] },
    { icon: IconPackage, label: "Products", to: "/products", roles: ["ADMIN", "OPERATIONS"] },
    { icon: IconShoppingCart, label: "Orders", to: "/orders", roles: ["ADMIN", "OPERATIONS", "SALES_MANAGER"] },
    { icon: IconUsers, label: "Users", to: "/users", roles: ["ADMIN"] },
];

/* ================================
   HELPERS
================================ */

/** Check if a given role has access to a specific route */
export function hasAccess(role: string | undefined, allowedRoles: AppRole[]): boolean {
    if (!role) return false;
    if (role === "ADMIN") return true; // ADMIN has access to everything
    return allowedRoles.includes(role as AppRole);
}

/** Get nav items accessible by a given role */
export function getNavItemsForRole(role: string | undefined): NavItem[] {
    return navItems.filter((item) => hasAccess(role, item.roles));
}

# KDM ProcureX - Frontend

A modern, responsive procurement management dashboard built with React and Mantine UI.

## 🚀 Technology Stack

- **Framework**: React 19 (Vite)
- **UI Component Library**: [Mantine UI v8](https://mantine.dev/)
- **Icons**: [Tabler Icons](https://tabler.io/icons)
- **State Management**: React Hooks & Context API
- **Routing**: React Router 7
- **API Client**: Axios
- **Form Handling**: Mantine Form
- **Styling**: PostCSS with Mantine's Design System

## 🏗️ Application Structure

The frontend is organized by feature-rich pages and a centralized configuration layer:

1. **Pages** (`src/pages`): Individual dashboard views (Dashboard, Orders, Dispatches, Suppliers, etc.).
2. **Context** (`src/context`): Context providers for Authentication and general app state.
3. **API Client** (`src/api`): Centralized Axios instance with request/response interceptors (e.g., for JWT injection).
4. **Components** (`src/components`): Reusable UI components like Layouts, Navigation, and Protected Routes.

## 💼 Key Features

### 📊 Interactive Dashboard
- Real-time statistics on POs, Dispatches, and Inventory levels.
- Visualization of orders by division and tracking of delayed shipments.

### 📝 Smart Order Management
- **Order Wizard**: Multi-item PO creation with dynamic product lookup and auto-calculation.
- **Approval Actions**: Dedicated UI for stakeholders to review and approve orders based on roles.

### 🚚 Dispatch tracking
- **Timeline View**: Visual representation of the dispatch lifecycle (Packed -> Shipped -> Delivered).
- **Notes & Logs**: Ability for suppliers/operators to add notes during status transitions.

### 📦 Inventory & Audit
- Real-time stock visibility and transaction history.
- Searchable Audit Logs for operational transparency.

## 📂 Project Structure

```bash
├── public/               # Static assets
├── src/
│   ├── api/              # Axios API client
│   ├── components/       # Common UI components
│   ├── context/          # Auth & App context
│   ├── pages/            # View components
│   ├── App.tsx           # Main routing logic
│   └── main.tsx          # App entry point
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## 🛠️ Setup & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Configure `.env` with `VITE_API_BASE_URL`.

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## 🎨 Design System

We use Mantine's modern design system, featuring:
- **Dark/Light Mode** support.
- **Optimized Typography** (Inter/system fonts).
- **Responsive Layouts** (Grid/Stack system).
- **Toast Notifications** for real-time feedback.

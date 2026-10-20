import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "@fontsource-variable/recursive/full.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/site.css";
import "./styles/admin.css";
import { Layout } from "./components/Layout";
import { Inicio } from "./pages/Inicio";
import { ReservaPagina } from "./pages/ReservaPagina";
import { Admin } from "./pages/Admin";
import { NaoEncontrada } from "./pages/NaoEncontrada";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Inicio /> },
      { path: "/reserva/:codigo", element: <ReservaPagina /> },
      { path: "/admin", element: <Admin /> },
      { path: "*", element: <NaoEncontrada /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

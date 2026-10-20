import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createMemoryRouter, RouterProvider } from "react-router";
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
import { MODO_APRESENTACAO } from "./lib/api";

const rotas = [
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Inicio /> },
      { path: "/reserva/:codigo", element: <ReservaPagina /> },
      { path: "/admin", element: <Admin /> },
      { path: "*", element: <NaoEncontrada /> },
    ],
  },
];

// Na apresentação o site é uma página única hospedada: a navegação fica em memória.
const router = MODO_APRESENTACAO ? createMemoryRouter(rotas) : createBrowserRouter(rotas);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

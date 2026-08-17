import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import ScrollOptions from "../app/scroll-options";
import "../app/globals.css";

const showScrollOptions = new URLSearchParams(window.location.search).has("scroll-options");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showScrollOptions ? <ScrollOptions /> : <Home />}
  </StrictMode>,
);

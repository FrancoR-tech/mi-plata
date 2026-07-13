import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/*
  La app fue creada dentro de un entorno que ofrecía "window.storage".
  En una web común eso no existe. Este puente lo reemplaza por el
  almacenamiento del navegador (localStorage), así los datos del usuario
  quedan guardados en su propio dispositivo, igual que antes.
*/
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value === null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { deleted: true };
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

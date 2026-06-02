"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PantallaTV() {
  const [productos, setProductos] = useState<any[]>([]);
  const [actual, setActual] = useState(0);

  useEffect(() => {
    obtenerOfertas();

    const intervaloDatos = setInterval(() => {
      obtenerOfertas();
    }, 60000);

    return () => clearInterval(intervaloDatos);
  }, []);

  useEffect(() => {
    if (productos.length === 0) return;

    const intervalo = setInterval(() => {
      setActual((prev) =>
        prev + 1 >= productos.length ? 0 : prev + 1
      );
    }, 6000);

    return () => clearInterval(intervalo);
  }, [productos]);

  async function obtenerOfertas() {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .eq("oferta", true)
      .order("nombre", { ascending: true });

    setProductos(data || []);
  }

  function precio(valor: number) {
    return Math.round(Number(valor)).toLocaleString("es-AR");
  }

  function cantidad(kilos: number, presentacion: string) {
    const pres = (presentacion || "").toUpperCase();

    if (pres === "UNIDAD") {
      return `${kilos} ${kilos === 1 ? "UNIDAD" : "UNIDADES"}`;
    }

    return `${kilos} ${pres}`;
  }

  const producto = productos[actual];

  if (!producto) {
    return (
      <div style={pantalla}>
        <img src="/logo.png" alt="logo" style={logo} />
        <h1 style={titulo}>EL NONO COQUI</h1>
        <h2 style={subtitulo}>No hay ofertas cargadas</h2>
      </div>
    );
  }

  return (
    <div style={pantalla}>
      <div style={header}>
        <img src="/logo.png" alt="logo" style={logo} />

        <div>
          <h1 style={titulo}>EL NONO COQUI</h1>
          <p style={ubicacion}>Esperanza - Santa Fe</p>
        </div>
      </div>

      <div style={badge}>🔥 OFERTAS DEL DÍA 🔥</div>

      <div style={card}>
        <div style={imagenBox}>
          {producto.imagen ? (
            <img
              src={producto.imagen}
              alt={producto.nombre}
              style={imagen}
            />
          ) : (
            <div style={sinImagen}>OFERTA</div>
          )}
        </div>

        <div style={info}>
          <h2 style={nombre}>{producto.nombre}</h2>

          <p style={cantidadStyle}>
            {cantidad(producto.kilos, producto.presentacion)}
          </p>

          <p style={precioStyle}>
            ${precio(producto.precio)}
          </p>

          <p style={pie}>precio final</p>
        </div>
      </div>

      <div style={footer}>
        📲 Pedidos por WhatsApp · 3496 550978
      </div>
    </div>
  );
}

const pantalla: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
  color: "white",
  padding: 40,
  fontFamily: "Arial, sans-serif",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 25,
  marginBottom: 30,
};

const logo: React.CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: 28,
  objectFit: "cover",
  background: "white",
  padding: 8,
};

const titulo: React.CSSProperties = {
  fontSize: "clamp(44px, 6vw, 90px)",
  fontWeight: 900,
  margin: 0,
  lineHeight: 1,
};

const ubicacion: React.CSSProperties = {
  fontSize: "clamp(22px, 3vw, 38px)",
  opacity: 0.75,
  marginTop: 10,
};

const subtitulo: React.CSSProperties = {
  fontSize: 42,
  marginTop: 40,
};

const badge: React.CSSProperties = {
  background: "linear-gradient(135deg, #dc2626, #ef4444)",
  padding: "22px 35px",
  borderRadius: 30,
  fontSize: "clamp(32px, 4vw, 60px)",
  fontWeight: 900,
  textAlign: "center",
  marginBottom: 35,
  boxShadow: "0 15px 40px rgba(239,68,68,0.35)",
};

const card: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.2fr",
  gap: 45,
  alignItems: "center",
  background: "rgba(15,23,42,0.9)",
  borderRadius: 45,
  padding: 45,
  border: "2px solid rgba(255,255,255,0.08)",
  boxShadow: "0 25px 70px rgba(0,0,0,0.45)",
};

const imagenBox: React.CSSProperties = {
  height: "55vh",
  background: "white",
  borderRadius: 35,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const imagen: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: 25,
};

const sinImagen: React.CSSProperties = {
  color: "#dc2626",
  fontSize: 70,
  fontWeight: 900,
};

const info: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const nombre: React.CSSProperties = {
  fontSize: "clamp(48px, 6vw, 95px)",
  fontWeight: 900,
  textTransform: "uppercase",
  lineHeight: 1,
  marginBottom: 25,
};

const cantidadStyle: React.CSSProperties = {
  fontSize: "clamp(34px, 4vw, 58px)",
  fontWeight: 800,
  opacity: 0.9,
  marginBottom: 25,
};

const precioStyle: React.CSSProperties = {
  fontSize: "clamp(70px, 9vw, 140px)",
  fontWeight: 900,
  color: "#22c55e",
  lineHeight: 1,
  margin: 0,
};

const pie: React.CSSProperties = {
  fontSize: "clamp(24px, 3vw, 42px)",
  opacity: 0.65,
  marginTop: 10,
};

const footer: React.CSSProperties = {
  position: "fixed",
  bottom: 25,
  left: 40,
  right: 40,
  textAlign: "center",
  fontSize: "clamp(22px, 2.5vw, 36px)",
  opacity: 0.85,
};
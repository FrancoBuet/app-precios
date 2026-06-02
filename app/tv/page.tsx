"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PRODUCTOS_POR_PAGINA = 4;
const SEGUNDOS_POR_PAGINA = 8000;

export default function PantallaTVGrid() {
  const [productos, setProductos] = useState<any[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hora, setHora] = useState("");

  useEffect(() => {
    obtenerOfertas();
    actualizarHora();

    const intervaloDatos = setInterval(obtenerOfertas, 60000);
    const intervaloHora = setInterval(actualizarHora, 30000);

    return () => {
      clearInterval(intervaloDatos);
      clearInterval(intervaloHora);
    };
  }, []);

  useEffect(() => {
    if (productos.length <= PRODUCTOS_POR_PAGINA) return;

    const intervaloPagina = setInterval(() => {
      setPagina((prev) => {
        const totalPaginas = Math.ceil(productos.length / PRODUCTOS_POR_PAGINA);
        return prev + 1 >= totalPaginas ? 0 : prev + 1;
      });
    }, SEGUNDOS_POR_PAGINA);

    return () => clearInterval(intervaloPagina);
  }, [productos]);

  async function obtenerOfertas() {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .eq("oferta", true)
      .order("nombre", { ascending: true });

    setProductos(data || []);
  }

  function actualizarHora() {
    const ahora = new Date();

    setHora(
      ahora.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  function precio(valor: number) {
    return Math.round(Number(valor)).toLocaleString("es-AR");
  }

  function cantidad(kilos: number, presentacion: string) {
    const pres = (presentacion || "").toUpperCase().trim();

    if (pres === "UNIDAD") {
      return `${kilos} ${kilos === 1 ? "UNIDAD" : "UNIDADES"}`;
    }

    return `${kilos} ${pres}`;
  }

  const totalPaginas = Math.ceil(productos.length / PRODUCTOS_POR_PAGINA);
  const inicio = pagina * PRODUCTOS_POR_PAGINA;
  const productosPagina = productos.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);

  return (
    <div style={pantalla}>
      <div style={header}>
        <div style={marca}>
          <img src="/logo.png" alt="logo" style={logo} />

          <div>
            <h1 style={titulo}>EL NONO COQUI</h1>
            <p style={ubicacion}>Esperanza - Santa Fe</p>
          </div>
        </div>

        <div style={derechaHeader}>
          <div style={horaStyle}>🕒 {hora}</div>
          <div style={badgePrincipal}>🔥 OFERTAS DEL DÍA</div>
        </div>
      </div>

      {productos.length === 0 ? (
        <div style={sinOfertas}>No hay ofertas cargadas</div>
      ) : (
        <>
          <div style={grid}>
            {productosPagina.map((producto) => (
              <div key={producto.id} style={card}>
                <div style={imagenBox}>
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      style={imagen}
                    />
                  ) : (
                    <div style={sinImagen}>🔥</div>
                  )}
                </div>

                <div style={info}>
                  <div style={badgeOferta}>🔥 OFERTA</div>

                  <h2 className="notranslate" translate="no" style={nombre}>
                    {producto.nombre}
                  </h2>

                  <p style={cantidadStyle}>
                    {cantidad(producto.kilos, producto.presentacion)}
                  </p>

                  <p style={precioStyle}>${precio(producto.precio)}</p>
                </div>
              </div>
            ))}
          </div>

          {totalPaginas > 1 && (
            <div style={paginador}>
              {Array.from({ length: totalPaginas }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    ...punto,
                    opacity: index === pagina ? 1 : 0.35,
                    transform: index === pagina ? "scale(1.25)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div style={footer}>
        📲 Pedidos por WhatsApp · 3496 550978
      </div>
    </div>
  );
}

const pantalla: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #020617 0%, #0f172a 50%, #111827 100%)",
  color: "white",
  padding: 28,
  fontFamily: "Arial, sans-serif",
  overflow: "hidden",
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 25,
  marginBottom: 22,
};

const marca: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
};

const logo: React.CSSProperties = {
  width: "clamp(70px, 7vw, 105px)",
  height: "clamp(70px, 7vw, 105px)",
  borderRadius: 26,
  objectFit: "cover",
  background: "white",
  padding: 8,
};

const titulo: React.CSSProperties = {
  fontSize: "clamp(34px, 4vw, 72px)",
  fontWeight: 900,
  margin: 0,
  lineHeight: 1,
};

const ubicacion: React.CSSProperties = {
  fontSize: "clamp(16px, 1.8vw, 30px)",
  opacity: 0.75,
  marginTop: 8,
};

const derechaHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const horaStyle: React.CSSProperties = {
  fontSize: "clamp(22px, 2.2vw, 38px)",
  fontWeight: 900,
  background: "rgba(255,255,255,0.08)",
  padding: "14px 22px",
  borderRadius: 22,
};

const badgePrincipal: React.CSSProperties = {
  background: "linear-gradient(135deg,#dc2626,#ef4444)",
  padding: "18px 32px",
  borderRadius: 28,
  fontSize: "clamp(24px, 3vw, 48px)",
  fontWeight: 900,
  whiteSpace: "nowrap",
  boxShadow: "0 15px 40px rgba(239,68,68,0.35)",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gridTemplateRows: "repeat(2, 1fr)",
  gap: 24,
  height: "calc(100vh - 220px)",
};

const card: React.CSSProperties = {
  background: "rgba(15,23,42,0.94)",
  borderRadius: 34,
  overflow: "hidden",
  border: "2px solid rgba(255,255,255,0.09)",
  boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  display: "grid",
  gridTemplateColumns: "35% 65%",
};

const imagenBox: React.CSSProperties = {
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const imagen: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  padding: 16,
};

const sinImagen: React.CSSProperties = {
  fontSize: "clamp(50px, 6vw, 90px)",
  color: "#dc2626",
};

const info: React.CSSProperties = {
  padding: "24px 30px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const badgeOferta: React.CSSProperties = {
  background: "linear-gradient(135deg,#dc2626,#ef4444)",
  color: "white",
  padding: "8px 16px",
  borderRadius: 999,
  fontSize: "clamp(14px, 1.4vw, 22px)",
  fontWeight: 900,
  width: "fit-content",
  marginBottom: 14,
  boxShadow: "0 8px 25px rgba(239,68,68,0.35)",
};

const nombre: React.CSSProperties = {
  fontSize: "clamp(34px, 4vw, 68px)",
  fontWeight: 900,
  textTransform: "uppercase",
  lineHeight: 1,
  margin: 0,
};

const cantidadStyle: React.CSSProperties = {
  fontSize: "clamp(24px, 2.5vw, 42px)",
  fontWeight: 800,
  opacity: 0.9,
  margin: "18px 0 12px",
};

const precioStyle: React.CSSProperties = {
  fontSize: "clamp(54px, 6vw, 110px)",
  fontWeight: 900,
  color: "#22c55e",
  lineHeight: 1,
  margin: 0,
};

const footer: React.CSSProperties = {
  position: "fixed",
  bottom: 12,
  left: 28,
  right: 28,
  textAlign: "center",
  fontSize: "clamp(16px, 1.8vw, 30px)",
  opacity: 0.85,
  fontWeight: 700,
};

const sinOfertas: React.CSSProperties = {
  height: "60vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "clamp(34px, 5vw, 80px)",
  fontWeight: 900,
  opacity: 0.8,
};

const paginador: React.CSSProperties = {
  position: "fixed",
  bottom: 58,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  gap: 10,
};

const punto: React.CSSProperties = {
  width: 13,
  height: 13,
  borderRadius: "50%",
  background: "white",
  transition: "0.3s ease",
};

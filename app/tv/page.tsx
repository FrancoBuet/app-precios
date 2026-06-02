"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PRODUCTOS_POR_PAGINA = 6;
const SEGUNDOS_POR_PAGINA = 8000;

export default function PantallaTVGrid() {
  const [productos, setProductos] = useState<any[]>([]);
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    obtenerOfertas();

    const intervaloDatos = setInterval(() => {
      obtenerOfertas();
    }, 60000);

    return () => clearInterval(intervaloDatos);
  }, []);

  useEffect(() => {
    if (productos.length <= PRODUCTOS_POR_PAGINA) return;

    const intervaloPagina = setInterval(() => {
      setPagina((prev) => {
        const totalPaginas = Math.ceil(
          productos.length / PRODUCTOS_POR_PAGINA
        );

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

  const totalPaginas = Math.ceil(
    productos.length / PRODUCTOS_POR_PAGINA
  );

  const inicio = pagina * PRODUCTOS_POR_PAGINA;

  const productosPagina = productos.slice(
    inicio,
    inicio + PRODUCTOS_POR_PAGINA
  );

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

        <div style={badgePrincipal}>🔥 OFERTAS DEL DÍA</div>
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

                  <div style={badgeOferta}>OFERTA</div>
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
                    transform:
                      index === pagina ? "scale(1.25)" : "scale(1)",
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
  marginBottom: 25,
};

const marca: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
};

const logo: React.CSSProperties = {
  width: "clamp(70px, 7vw, 110px)",
  height: "clamp(70px, 7vw, 110px)",
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
  gridTemplateColumns: "repeat(3, 1fr)",
  gridTemplateRows: "repeat(2, 1fr)",
  gap: 22,
  height: "calc(100vh - 230px)",
};

const card: React.CSSProperties = {
  background: "rgba(15,23,42,0.92)",
  borderRadius: 32,
  overflow: "hidden",
  border: "2px solid rgba(255,255,255,0.08)",
  boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  display: "grid",
  gridTemplateRows: "45% 55%",
};

const imagenBox: React.CSSProperties = {
  position: "relative",
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
  padding: 14,
};

const sinImagen: React.CSSProperties = {
  fontSize: "clamp(42px, 5vw, 80px)",
};

const badgeOferta: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  background: "linear-gradient(135deg,#dc2626,#ef4444)",
  color: "white",
  padding: "7px 14px",
  borderRadius: 999,
  fontSize: "clamp(12px, 1.2vw, 18px)",
  fontWeight: 900,
  boxShadow: "0 8px 25px rgba(239,68,68,0.4)",
};

const info: React.CSSProperties = {
  padding: "16px 22px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const nombre: React.CSSProperties = {
  fontSize: "clamp(22px, 2.4vw, 42px)",
  fontWeight: 900,
  textTransform: "uppercase",
  lineHeight: 1.05,
  margin: 0,
};

const cantidadStyle: React.CSSProperties = {
  fontSize: "clamp(17px, 1.8vw, 30px)",
  fontWeight: 800,
  opacity: 0.9,
  margin: "10px 0 7px",
};

const precioStyle: React.CSSProperties = {
  fontSize: "clamp(32px, 3.6vw, 66px)",
  fontWeight: 900,
  color: "#22c55e",
  lineHeight: 1,
  margin: 0,
};

const pie: React.CSSProperties = {
  fontSize: "clamp(13px, 1.2vw, 22px)",
  opacity: 0.6,
  marginTop: 5,
};

const footer: React.CSSProperties = {
  position: "fixed",
  bottom: 12,
  left: 28,
  right: 28,
  textAlign: "center",
  fontSize: "clamp(16px, 1.8vw, 30px)",
  opacity: 0.8,
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
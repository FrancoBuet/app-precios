"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  const [loading, setLoading] = useState(false);

  const [preview, setPreview] = useState("");
  const [productos, setProductos] = useState<any[]>([]);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [kilos, setKilos] = useState("");

  const [precioMayorista, setPrecioMayorista] =
    useState("");

  const [precioPublico, setPrecioPublico] =
    useState("");

  const [oferta, setOferta] = useState(false);

  const [imagen, setImagen] = useState<File | null>(null);

  const [busqueda, setBusqueda] = useState("");

  const [seccion, setSeccion] = useState("inicio");

  const [user, setUser] = useState<any>(null);

  const [editandoId, setEditandoId] =
    useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const temaGuardado =
      localStorage.getItem("darkMode");

    if (temaGuardado === "true") {
      setDarkMode(true);
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    obtenerProductos();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "darkMode",
      darkMode.toString()
    );
  }, [darkMode]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function obtenerProductos() {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    setProductos(data || []);
  }

  function mostrarMensaje(texto: string) {
    setMensaje(texto);

    setTimeout(() => {
      setMensaje("");
    }, 3000);
  }

  async function agregarProducto() {
    if (
      !nombre ||
      !precioMayorista ||
      !precioPublico
    ) {
      alert("Completa todos los precios");
      return;
    }

    setLoading(true);

    let imagenUrl = preview || "";

    if (imagen) {
      const nombreArchivo = `${Date.now()}-${imagen.name}`;

      const { error: uploadError } =
        await supabase.storage
          .from("productos")
          .upload(nombreArchivo, imagen);

      if (uploadError) {
        alert(uploadError.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("productos")
        .getPublicUrl(nombreArchivo);

      imagenUrl = data.publicUrl;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("productos")
        .update({
          nombre,
          tipo,
          presentacion,
          kilos: Number(kilos),

          precio_mayorista: Number(
            precioMayorista
          ),

          precio_publico: Number(
            precioPublico
          ),

          oferta,

          imagen: imagenUrl,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      mostrarMensaje(
        "Producto actualizado correctamente"
      );

      setEditandoId(null);
    } else {
      const { error } = await supabase
        .from("productos")
        .insert([
          {
            nombre,
            tipo,
            presentacion,
            kilos: Number(kilos),

            precio_mayorista: Number(
              precioMayorista
            ),

            precio_publico: Number(
              precioPublico
            ),

            oferta,

            imagen: imagenUrl,
          },
        ]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      mostrarMensaje(
        "Producto agregado correctamente"
      );
    }

    setNombre("");
    setTipo("");
    setPresentacion("");
    setKilos("");

    setPrecioMayorista("");
    setPrecioPublico("");

    setOferta(false);

    setImagen(null);

    setPreview("");

    obtenerProductos();

    setLoading(false);
  }

  async function eliminarProducto(id: number) {
    const confirmar = confirm(
      "¿Seguro que querés eliminar este producto?"
    );

    if (!confirmar) return;

    await supabase
      .from("productos")
      .delete()
      .eq("id", id);

    obtenerProductos();

    mostrarMensaje("Producto eliminado");
  }

  function editarProducto(producto: any) {
    setEditandoId(producto.id);

    setNombre(producto.nombre || "");

    setTipo(producto.tipo || "");

    setPresentacion(
      producto.presentacion || ""
    );

    setKilos(
      producto.kilos?.toString() || ""
    );

    setPrecioMayorista(
      producto.precio_mayorista?.toString() ||
        ""
    );

    setPrecioPublico(
      producto.precio_publico?.toString() ||
        ""
    );

    setOferta(producto.oferta || false);

    if (producto.imagen) {
      setPreview(producto.imagen);
    }
  }

  let productosFiltrados = productos.filter(
    (producto) =>
      producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  if (seccion === "ofertas") {
    productosFiltrados =
      productosFiltrados.filter(
        (p) => p.oferta
      );
  }

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: darkMode
          ? "#111827"
          : "#f3f4f6",
        minHeight: "100vh",
        color: darkMode ? "white" : "black",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 38,
              fontWeight: "bold",
            }}
          >
            Mi Catálogo
          </h1>

          <p
            style={{
              opacity: 0.7,
            }}
          >
            Mayorista & Público
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            style={botonHeader(
              darkMode
            )}
          >
            {darkMode
              ? "☀️"
              : "🌙"}
          </button>

          {user && (
            <button
              onClick={cerrarSesion}
              style={{
                ...botonHeader(
                  darkMode
                ),
                backgroundColor:
                  "#dc2626",
                color: "white",
              }}
            >
              Salir
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div
          style={{
            backgroundColor:
              "#d1fae5",
            color: "#065f46",
            padding: 14,
            borderRadius: 12,
            marginBottom: 20,
            fontWeight: "bold",
          }}
        >
          {mensaje}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 15,
          marginBottom: 30,
        }}
      >
        <button
          onClick={() =>
            setSeccion("ofertas")
          }
          style={menuStyle(
            "#dc2626"
          )}
        >
          🔥 Ofertas
        </button>

        <button
          onClick={() =>
            setSeccion(
              "mayorista"
            )
          }
          style={menuStyle(
            "#2563eb"
          )}
        >
          📦 Mayorista
        </button>

        <button
          onClick={() =>
            setSeccion("publico")
          }
          style={menuStyle(
            "#16a34a"
          )}
        >
          🛒 Público
        </button>
      </div>

      {user && (
        <div
          style={{
            backgroundColor:
              darkMode
                ? "#1f2937"
                : "white",
            borderRadius: 20,
            padding: 25,
            marginBottom: 30,
          }}
        >
          <h2
            style={{
              marginBottom: 20,
            }}
          >
            {editandoId
              ? "✏️ Editar Producto"
              : "➕ Agregar Producto"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 15,
            }}
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) =>
                setNombre(
                  e.target.value
                )
              }
              style={inputStyle(
                darkMode
              )}
            />

            <input
              placeholder="Tipo"
              value={tipo}
              onChange={(e) =>
                setTipo(
                  e.target.value
                )
              }
              style={inputStyle(
                darkMode
              )}
            />

            <input
              placeholder="Presentación"
              value={presentacion}
              onChange={(e) =>
                setPresentacion(
                  e.target.value
                )
              }
              style={inputStyle(
                darkMode
              )}
            />

            <input
              placeholder="Kilos"
              value={kilos}
              onChange={(e) =>
                setKilos(
                  e.target.value
                )
              }
              style={inputStyle(
                darkMode
              )}
            />

            <input
              placeholder="Precio Mayorista"
              value={
                precioMayorista
              }
              onChange={(e) =>
                setPrecioMayorista(
                  e.target.value
                )
              }
              style={inputStyle(
                darkMode
              )}
            />

            <input
              placeholder="Precio Público"
              value={
                precioPublico
              }
              onChange={(e) =>
                setPrecioPublico(
                  e.target.value
                )
              }
              style={inputStyle(
                darkMode
              )}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (
                  e.target.files &&
                  e.target.files[0]
                ) {
                  setImagen(
                    e.target.files[0]
                  );

                  const imageUrl =
                    URL.createObjectURL(
                      e.target
                        .files[0]
                    );

                  setPreview(
                    imageUrl
                  );
                }
              }}
              style={inputStyle(
                darkMode
              )}
            />
          </div>

          <label
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 10,
              marginTop: 20,
              fontWeight: "bold",
            }}
          >
            <input
              type="checkbox"
              checked={oferta}
              onChange={(e) =>
                setOferta(
                  e.target.checked
                )
              }
            />

            Producto en oferta
          </label>

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 300,
                objectFit: "cover",
                borderRadius: 15,
                marginTop: 20,
              }}
            />
          )}

          <button
            onClick={
              agregarProducto
            }
            disabled={loading}
            style={{
              marginTop: 20,
              width: "100%",
              padding: 16,
              backgroundColor:
                "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontWeight: "bold",
            }}
          >
            {loading
              ? "Guardando..."
              : editandoId
              ? "Guardar Cambios"
              : "Agregar Producto"}
          </button>
        </div>
      )}

      <input
        placeholder="🔍 Buscar..."
        value={busqueda}
        onChange={(e) =>
          setBusqueda(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: 16,
          borderRadius: 14,
          border: "none",
          marginBottom: 30,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 25,
        }}
      >
        {productosFiltrados.map(
          (producto) => (
            <div
              key={producto.id}
              style={{
                backgroundColor:
                  darkMode
                    ? "#1f2937"
                    : "white",
                borderRadius: 22,
                overflow:
                  "hidden",
              }}
            >
              <img
                src={
                  producto.imagen ||
                  "https://via.placeholder.com/400x300?text=Producto"
                }
                alt={
                  producto.nombre
                }
                style={{
                  width: "100%",
                  height: 240,
                  objectFit:
                    "cover",
                }}
              />

              <div
                style={{
                  padding: 20,
                }}
              >
                <h2
                  style={{
                    fontSize: 30,
                    marginBottom: 10,
                  }}
                >
                  {
                    producto.nombre
                  }
                </h2>

                <p>
                  Presentación:{" "}
                  {
                    producto.presentacion
                  }
                </p>

                <p>
                  Kg:{" "}
                  {
                    producto.kilos
                  }
                </p>

                {seccion ===
                "mayorista" ? (
                  <p
                    style={{
                      fontSize: 34,
                      fontWeight:
                        "bold",
                      color:
                        "#2563eb",
                    }}
                  >
                    $
                    {Number(
                      producto.precio_mayorista
                    ).toLocaleString(
                      "es-AR"
                    )}
                  </p>
                ) : (
                  <p
                    style={{
                      fontSize: 34,
                      fontWeight:
                        "bold",
                      color:
                        "#16a34a",
                    }}
                  >
                    $
                    {Number(
                      producto.precio_publico
                    ).toLocaleString(
                      "es-AR"
                    )}
                  </p>
                )}

                {producto.oferta && (
                  <div
                    style={{
                      marginTop: 10,
                      backgroundColor:
                        "#dc2626",
                      color:
                        "white",
                      padding:
                        "6px 12px",
                      borderRadius: 999,
                      display:
                        "inline-block",
                      fontWeight:
                        "bold",
                    }}
                  >
                    OFERTA
                  </div>
                )}

                {user && (
                  <>
                    <button
                      onClick={() =>
                        editarProducto(
                          producto
                        )
                      }
                      style={
                        botonCard(
                          "#f59e0b"
                        )
                      }
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        eliminarProducto(
                          producto.id
                        )
                      }
                      style={
                        botonCard(
                          "#dc2626"
                        )
                      }
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function inputStyle(
  darkMode: boolean
) {
  return {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "none",
    backgroundColor: darkMode
      ? "#374151"
      : "#f3f4f6",
    color: darkMode
      ? "white"
      : "black",
    fontSize: 15,
  };
}

function botonHeader(
  darkMode: boolean
) {
  return {
    backgroundColor: darkMode
      ? "#facc15"
      : "#111",
    color: darkMode
      ? "black"
      : "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "bold",
  };
}

function menuStyle(color: string) {
  return {
    backgroundColor: color,
    color: "white",
    border: "none",
    borderRadius: 18,
    padding: 25,
    fontSize: 22,
    fontWeight: "bold",
    cursor: "pointer",
  };
}

function botonCard(color: string) {
  return {
    width: "100%",
    padding: 12,
    backgroundColor: color,
    color: "white",
    border: "none",
    borderRadius: 10,
    marginTop: 10,
    cursor: "pointer",
    fontWeight: "bold",
  };
}
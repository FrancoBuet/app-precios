const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const INTERVALO_MS = Number(process.env.PEDIDOS_PRINT_INTERVAL_MS || 5000);
const PRINTER_NAME = process.env.PEDIDOS_PRINTER_NAME || "EPSON TM-T20II Receipt5";
const COLUMNAS = Number(process.env.PEDIDOS_PRINT_COLUMNS || 42);
const DRY_RUN = process.argv.includes("--dry-run");
const ONCE = process.argv.includes("--once");

function cargarEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = { ...cargarEnvLocal(), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function precio(valor) {
  return money.format(Math.round(Number(valor || 0)));
}

function fechaArgentina(valor) {
  return new Date(valor).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function quitarAcentos(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cortarTexto(texto, ancho) {
  const palabras = quitarAcentos(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";

  for (const palabra of palabras) {
    if (!actual) {
      actual = palabra;
    } else if (`${actual} ${palabra}`.length <= ancho) {
      actual += ` ${palabra}`;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }

  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

function lineaProducto(texto, total) {
  const anchoTotal = COLUMNAS;
  const anchoPrecio = 10;
  const anchoTexto = anchoTotal - anchoPrecio - 1;
  const precioTexto = `$${precio(total)}`.slice(0, anchoPrecio);
  const lineas = cortarTexto(texto, anchoTexto);
  const primera = `${lineas[0].padEnd(anchoTexto, " ")} ${precioTexto.padStart(anchoPrecio, " ")}`;
  const extras = lineas.slice(1).map((linea) => linea);
  return [primera, ...extras].join("\n");
}

function armarTicket(pedido) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const tituloPedido = pedido.numero ? `Pedido #${pedido.numero}` : "Pedido";
  const lineas = [
    "EL NONO COQUI".padStart(Math.floor((COLUMNAS + "EL NONO COQUI".length) / 2), " "),
    tituloPedido.padStart(Math.floor((COLUMNAS + tituloPedido.length) / 2), " "),
    fechaArgentina(pedido.created_at).padStart(Math.floor((COLUMNAS + fechaArgentina(pedido.created_at).length) / 2), " "),
    "-".repeat(COLUMNAS),
    ...items.map((item) => lineaProducto(item.texto || item.nombre || "", item.total)),
    lineaProducto("Envio", pedido.envio),
    "-".repeat(COLUMNAS),
    `Total${`$${precio(pedido.total)}`.padStart(COLUMNAS - 5, " ")}`,
    "-".repeat(COLUMNAS),
    `Nombre: ${quitarAcentos(pedido.cliente_nombre || "")}`,
    `Telefono: ${quitarAcentos(pedido.cliente_telefono || "")}`,
    ...cortarTexto(`Direccion: ${pedido.direccion || ""}`, COLUMNAS),
    ...(pedido.notas ? cortarTexto(`Aclaraciones: ${pedido.notas}`, COLUMNAS) : []),
    "-".repeat(COLUMNAS),
    "Gracias por tu pedido".padStart(Math.floor((COLUMNAS + "Gracias por tu pedido".length) / 2), " "),
    "",
    "",
    "",
  ];

  return lineas.join(os.EOL);
}

function ascii(texto) {
  return Buffer.from(quitarAcentos(texto).replace(/[^\x00-\x7F]/g, ""), "ascii");
}

function escposTexto(bufferes, texto = "") {
  bufferes.push(ascii(`${texto}\n`));
}

function escposComando(bufferes, bytes) {
  bufferes.push(Buffer.from(bytes));
}

function armarTicketEscpos(pedido) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const tituloPedido = pedido.numero ? `Pedido #${pedido.numero}` : "Pedido";
  const bufferes = [];

  escposComando(bufferes, [0x1b, 0x40]);
  escposComando(bufferes, [0x1b, 0x74, 0x02]);
  escposComando(bufferes, [0x1b, 0x61, 0x01]);
  escposComando(bufferes, [0x1b, 0x45, 0x01]);
  escposTexto(bufferes, "EL NONO COQUI");
  escposComando(bufferes, [0x1b, 0x45, 0x00]);
  escposTexto(bufferes, tituloPedido);
  escposTexto(bufferes, fechaArgentina(pedido.created_at));
  escposComando(bufferes, [0x1b, 0x61, 0x00]);
  escposTexto(bufferes, "-".repeat(COLUMNAS));

  for (const item of items) {
    escposTexto(bufferes, lineaProducto(item.texto || item.nombre || "", item.total));
  }

  escposTexto(bufferes, lineaProducto("Envio", pedido.envio));
  escposTexto(bufferes, "-".repeat(COLUMNAS));
  escposComando(bufferes, [0x1b, 0x45, 0x01]);
  escposTexto(bufferes, `Total${`$${precio(pedido.total)}`.padStart(COLUMNAS - 5, " ")}`);
  escposComando(bufferes, [0x1b, 0x45, 0x00]);
  escposTexto(bufferes, "-".repeat(COLUMNAS));
  escposTexto(bufferes, `Nombre: ${pedido.cliente_nombre || ""}`);
  escposTexto(bufferes, `Telefono: ${pedido.cliente_telefono || ""}`);
  cortarTexto(`Direccion: ${pedido.direccion || ""}`, COLUMNAS).forEach((linea) => escposTexto(bufferes, linea));
  if (pedido.notas) {
    cortarTexto(`Aclaraciones: ${pedido.notas}`, COLUMNAS).forEach((linea) => escposTexto(bufferes, linea));
  }
  escposTexto(bufferes, "-".repeat(COLUMNAS));
  escposComando(bufferes, [0x1b, 0x61, 0x01]);
  escposTexto(bufferes, "Gracias por tu pedido");
  escposTexto(bufferes, "");
  escposTexto(bufferes, "");
  escposTexto(bufferes, "");
  escposComando(bufferes, [0x1d, 0x56, 0x42, 0x00]);

  return Buffer.concat(bufferes);
}

function imprimirTicketRaw(pedido) {
  const texto = armarTicket(pedido);
  const bytes = armarTicketEscpos(pedido);
  const archivo = path.join(os.tmpdir(), `pedido-${pedido.id}.bin`);
  fs.writeFileSync(archivo, bytes);

  if (DRY_RUN) {
    console.log(`\n--- TICKET ${pedido.id} ---\n${texto}`);
    return;
  }

  const resultado = spawnSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(__dirname, "raw-print.ps1"),
    "-PrinterName",
    PRINTER_NAME,
    "-Path",
    archivo,
  ], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (resultado.status !== 0) {
    throw new Error(resultado.stderr || resultado.stdout || "Windows no pudo enviar el ticket RAW a la impresora");
  }
}

async function marcarImpreso(id) {
  const { error } = await supabase
    .from("pedidos")
    .update({
      estado: DRY_RUN ? "prueba_impresion" : "impreso",
      impreso_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

async function buscarPedidosNuevos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .is("impreso_at", null)
    .eq("estado", "nuevo")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) throw error;
  return data || [];
}

async function ciclo() {
  const pedidos = await buscarPedidosNuevos();

  for (const pedido of pedidos) {
    console.log(`Imprimiendo pedido ${pedido.id} - ${pedido.cliente_nombre || "sin nombre"}`);
    imprimirTicketRaw(pedido);
    await marcarImpreso(pedido.id);
    console.log(`Pedido ${pedido.id} marcado como impreso`);
  }

  if (pedidos.length === 0) {
    console.log(`Sin pedidos nuevos. Esperando ${INTERVALO_MS / 1000}s...`);
  }
}

async function main() {
  console.log(`Monitor de pedidos iniciado`);
  console.log(`Impresora: ${PRINTER_NAME}`);
  if (DRY_RUN) console.log("Modo prueba: no envia a la impresora");

  await ciclo();
  if (ONCE) return;

  setInterval(() => {
    ciclo().catch((error) => {
      console.error("Error en monitor:", error.message);
    });
  }, INTERVALO_MS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

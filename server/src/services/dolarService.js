const INFODOLAR_MDP_URL = "https://www.infodolar.com/cotizacion-dolar-localidad-mar-del-plata-provincia-buenos-aires.aspx";
const DOLARAPI_FALLBACK_URL = "https://dolarapi.com/v1/dolares/blue";
const FUENTE_MDP = "InfoDolar Mar del Plata";
const FUENTE_FALLBACK = "DolarApi (Blue nacional, fallback)";

function parsePrecioArs(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = s.split(".");
    if (parts.length > 2) s = parts.join("");
    else if (parts.length === 2 && parts[0].length > 3) s = parts.join("");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchConTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9"
      }
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchInfodolarMdp() {
  const res = await fetchConTimeout(INFODOLAR_MDP_URL);
  if (!res.ok) throw new Error(`InfoDolar respondió HTTP ${res.status}`);
  const html = await res.text();

  const tablaIdx = html.indexOf('id="BluePromedio"');
  let section;
  if (tablaIdx !== -1) {
    const endIdx = html.indexOf("</table>", tablaIdx);
    section = html.slice(tablaIdx, endIdx !== -1 ? endIdx : undefined);
  } else {
    section = html;
  }

  const precios = [...section.matchAll(/colCompraVenta[^>]*data-order="([^"]+)"/g)]
    .map(m => parsePrecioArs(m[1]))
    .filter(v => v !== null);

  const compra = precios[0] ?? null;
  const venta = precios[1] ?? null;
  if (venta === null || venta <= 0) throw new Error("No se pudo extraer el valor de venta de InfoDolar");

  const fechaMatch = section.match(/<abbr[^>]*class="[^"]*timeago[^"]*"[^>]*title="([^"]+)"/i)
    || section.match(/datetime="([^"]+)"/i);

  return {
    compra,
    venta,
    fechaActualizacion: fechaMatch ? fechaMatch[1] : new Date().toISOString(),
    fuente: FUENTE_MDP
  };
}

async function fetchFallbackNacional() {
  const res = await fetchConTimeout(DOLARAPI_FALLBACK_URL);
  if (!res.ok) throw new Error(`DolarApi respondió HTTP ${res.status}`);
  const data = await res.json();
  const venta = parseFloat(data?.venta);
  const compra = parseFloat(data?.compra);
  if (!Number.isFinite(venta) || venta <= 0) throw new Error("DolarApi sin datos válidos");
  return {
    compra: Number.isFinite(compra) ? compra : null,
    venta,
    fechaActualizacion: data?.fechaActualizacion || new Date().toISOString(),
    fuente: FUENTE_FALLBACK
  };
}

async function fetchDolarBlueMdp() {
  try {
    return await fetchInfodolarMdp();
  } catch (e) {
    console.warn("InfoDolar falló, usando fallback:", e.message);
    return await fetchFallbackNacional();
  }
}

async function obtenerDolarActual(configStore) {
  const actualizado = configStore?.dolar_blue_actualizado
    ? new Date(configStore.dolar_blue_actualizado)
    : null;

  const esValido = actualizado && !isNaN(actualizado.getTime());
  const edadMs = esValido ? Date.now() - actualizado.getTime() : Infinity;
  const fresco = esValido && edadMs < 12 * 60 * 60 * 1000;

  if (fresco && parseFloat(configStore.dolar_blue) > 0) {
    return {
      venta: parseFloat(configStore.dolar_blue),
      compra: configStore.dolar_blue_compra ? parseFloat(configStore.dolar_blue_compra) : null,
      fechaActualizacion: configStore.dolar_blue_actualizado,
      fuente: configStore.dolar_blue_fuente || "Manual",
      actualizadoAhora: false
    };
  }

  const fresh = await fetchDolarBlueMdp();
  return { ...fresh, actualizadoAhora: true };
}

module.exports = { fetchDolarBlueMdp, obtenerDolarActual };

import fallbackData from "../data/fallbackData";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TrendingUp, Plus, DollarSign, Smartphone, User, CheckCircle2, ShieldCheck, Tag, Search, Check, Sparkles, Pencil, Trash2 } from 'lucide-react';

const Donut = ({ npPct, mardelPct, otrosPct }) => {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const seg = (pct, color, offset) => {
    if (pct <= 0) return null;
    const len = (pct / 100) * CIRC;
    return (
      <circle
        r={R}
        cx="64"
        cy="64"
        fill="none"
        stroke={color}
        strokeWidth="18"
        strokeDasharray={`${len} ${CIRC - len}`}
        strokeDashoffset={offset}
        transform="rotate(-90 64 64)"
      />
    );
  };
  const total = npPct + mardelPct + otrosPct;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-slate-500">
        Sin ventas en el período.
      </div>
    );
  }
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 mx-auto">
      {seg(npPct, '#38bdf8', 0)}
      {seg(mardelPct, '#34d399', -(npPct / 100) * CIRC)}
      {seg(otrosPct, '#64748b', -((npPct + mardelPct) / 100) * CIRC)}
    </svg>
  );
};

export default function Ventas({ config, onDataChange }) {
  const MESES_NOMBRES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const keyMes = (f) => {
    if (typeof f === 'string' && /^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 7);
    const d = f ? new Date(f) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const labelMes = (k) => { const [y, m] = String(k || '').split('-'); const nombre = MESES_NOMBRES[parseInt(m, 10) - 1] || k; return String(y) === String(new Date().getFullYear()) ? nombre : `${nombre} ${y}`; };
const fmtFecha = (iso) => {
    if (!iso) return '-';
    if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
      const [y, mo, d] = iso.slice(0, 10).split('-');
      return `${d}/${mo}/${y}`;
    }
    try { return new Date(iso).toLocaleDateString('es-AR'); } catch { return String(iso || '-'); }
  };

  const hoyInput = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Convierte una fecha ISO/string en valor yyyy-MM-dd (para <input type="date">)
  const toInputDate = (iso) => {
    if (!iso) return '';
    const s = String(iso);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
  };

  const [ventas, setVentas] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [ordenVentas, setOrdenVentas] = useState('fecha_desc'); // 'fecha_desc' | 'fecha_asc'
  const mesInitRef = useRef(false);
  const [dispositivosStock, setDispositivosStock] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchDispositivo, setSearchDispositivo] = useState('');
  const [tipoVenta, setTipoVenta] = useState('DISPOSITIVO'); // 'DISPOSITIVO' o 'ACCESORIO_LIBRE'
  const [editandoVenta, setEditandoVenta] = useState(null);
  const [modoRegalo, setModoRegalo] = useState(null); // label del combo elegido o 'custom'
  const regaloInputRef = useRef(null);
  const [combosExtra, setCombosExtra] = useState([]);

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  const extractKeywords = (label) =>
    String(label || '').toLowerCase().split(/[+,\/]/).map(s => s.trim()).filter(Boolean);

  const parseCombos = (raw) => {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(c => {
        const label = typeof c === 'string' ? c : (c.label || '');
        return { label, keywords: Array.isArray(c.keywords) && c.keywords.length > 0 ? c.keywords : extractKeywords(label) };
      }).filter(c => c.label);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    setCombosExtra(parseCombos(config?.combos_regalos));
  }, [config?.combos_regalos]);

  // Combos predeterminados + los guardados por el usuario
  const combosRegalo = [
    { label: 'Funda + Vidrio', keywords: ['funda', 'vidrio'] },
    { label: 'Funda + Vidrio + Cargador', keywords: ['funda', 'vidrio', 'cargador'] },
    ...combosExtra
  ];

  // Form State
  const [formData, setFormData] = useState({
    fecha: hoyInput(),
    dispositivo_id: '',
    dispositivo_seleccionado: null,
    item_detalle: '',
    cliente_nombre: '',
    cliente_contacto: '',
    vendedor_nombre: 'NP',
    moneda_venta: 'USD',
    precio_venta_usd: '',
    precio_venta_pesos: '',
    cotizacion_dolar: dolarCotiz,
    costo_total_usd: 0,
    costo_reparacion: 0,
    descuento_monto: 0,
    descuentos_regalos_detalle: '',
    regalo_componentes: [],
    regalo_costo_snapshot_usd: 0,
    comision_vendedor_pesos: 0,
    comision_se_pago: false,
    entrega: false,
    caja_destino: 'Caja Dólares',
    metodo_pago: 'Efectivo USD',
    impactar_caja: true,
    observaciones: ''
  });

  // Abono desdoblado: [{caja, monto, moneda}]. Si queda vacío, la venta cae a caja_destino simple.
  const [pagos, setPagos] = useState([]);

  useEffect(() => {
    fetchVentasData();
  }, []);

  const fetchVentasData = async () => {
    try {
      setLoading(true);
      const [resVentas, resDisp, resVend, resCajas, resInv] = await Promise.all([
        fetch('/api/ventas').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/dispositivos').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/vendedores').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/cajas').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/inventario').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const v = (resVentas && Array.isArray(resVentas) && resVentas.length > 0) ? resVentas : (fallbackData.ventas || []);
      const d = (resDisp && Array.isArray(resDisp) && resDisp.length > 0) ? resDisp : (fallbackData.dispositivos || []);
      const vend = (resVend && Array.isArray(resVend) && resVend.length > 0) ? resVend : (fallbackData.vendedores || []);
      const c = (resCajas && Array.isArray(resCajas) && resCajas.length > 0) ? resCajas : (fallbackData.cuentas_caja || []);
      const inv = (resInv && Array.isArray(resInv) && resInv.length > 0) ? resInv : (fallbackData.inventario_items || []);

      setVentas(v);
      setDispositivosStock(d.filter(item => item.estado === 'En Stock' || item.estado === 'Señado'));
      setVendedores(vend);
      setCajas(c);
      setInventario(inv);
    } catch (err) {
      console.error("Error fetching data:", err);
      setVentas(fallbackData.ventas || []);
      setDispositivosStock((fallbackData.dispositivos || []).filter(item => item.estado === 'En Stock' || item.estado === 'Señado'));
      setVendedores(fallbackData.vendedores || []);
      setCajas(fallbackData.cuentas_caja || []);
      setInventario(fallbackData.inventario_items || []);
    } finally {
      setLoading(false);
    }
  };

  // Al primer cargar de ventas, fijar el mes por defecto: el mes corriente (ej: SEPTIEMBRE)
  useEffect(() => {
    if (mesInitRef.current || !ventas || ventas.length === 0) return;
    mesInitRef.current = true;
    const keys = [...new Set(ventas.map(v => keyMes(v.fecha)))];
    const hoy = keyMes();
    const conDat = keys.sort().reverse()[0];
    setMesSeleccionado(keys.includes(hoy) ? hoy : (conDat || null));
  }, [ventas]);

  // Al seleccionar un teléfono de la lista visual
  const handleSelectDispositivo = (disp) => {
    if (!disp) {
      setFormData(prev => ({
        ...prev,
        dispositivo_id: '',
        dispositivo_seleccionado: null,
        item_detalle: '',
        costo_total_usd: 0,
        costo_reparacion: 0,
        precio_venta_usd: '',
        precio_venta_pesos: ''
      }));
      return;
    }

    const pUSD = disp.precio_sugerido_usd || 0;
    setFormData(prev => ({
      ...prev,
      dispositivo_id: disp.id,
      dispositivo_seleccionado: disp,
      item_detalle: `${disp.modelo} ${disp.capacidad || ''} ${disp.color || ''} (IMEI: ${disp.imei ? disp.imei.slice(-6) : 'S/N'})`,
      costo_total_usd: disp.costo_usd || 0,
      costo_reparacion: disp.costo_reparacion_usd || 0,
      precio_venta_usd: pUSD || '',
      precio_venta_pesos: pUSD ? (pUSD * (parseFloat(prev.cotizacion_dolar) || dolarCotiz)).toFixed(0) : ''
    }));
  };

  // Al editar una venta ya cargada, precargar el formulario con sus datos
  const handleEditVenta = (v) => {
    setTipoVenta('ACCESORIO_LIBRE');
    setEditandoVenta(v);
    setSearchDispositivo('');
    // Cargar el desglose de abono si la venta lo tenía
    let desglose = [];
    try {
      const p = typeof v.desglose_pago === 'string' ? JSON.parse(v.desglose_pago || '[]') : (v.desglose_pago || []);
      desglose = Array.isArray(p) ? p.filter(x => x.caja && parseFloat(x.monto) > 0) : [];
    } catch { desglose = []; }
    if (desglose.length === 0) {
      const moneda = /pesos/i.test(v.caja_destino || '') ? 'ARS' : 'USD';
      const monto = moneda === 'ARS' ? (parseFloat(v.precio_venta_pesos) || 0) : (parseFloat(v.precio_venta_usd) || 0);
      if (monto > 0) desglose = [{ caja: v.caja_destino || 'Caja Dólares', monto, moneda }];
    }
    setPagos(desglose);
    const componentes = (() => {
      try {
        const p = JSON.parse(v.regalo_componentes || '[]');
        return Array.isArray(p) ? p : [];
      } catch { return []; }
    })();
    const snapshotAcc = parseFloat(v.regalo_costo_snapshot_usd) || 0;
    const label = v.descuentos_regalos_detalle || '';
    setModoRegalo(label || 'custom');
    setFormData({
      fecha: toInputDate(v.fecha) || hoyInput(),
      dispositivo_id: v.dispositivo_id || '',
      dispositivo_seleccionado: null,
      item_detalle: v.item_detalle || '',
      cliente_nombre: v.cliente_nombre || '',
      cliente_contacto: v.cliente_contacto || '',
      vendedor_nombre: v.vendedor_nombre || 'NP',
      moneda_venta: 'USD',
      precio_venta_usd: v.precio_venta_usd ?? '',
      precio_venta_pesos: v.precio_venta_pesos ?? '',
      cotizacion_dolar: parseFloat(v.cotizacion_dolar) || dolarCotiz,
      costo_total_usd: v.costo_total_usd || 0,
      costo_reparacion: v.costo_reparacion || 0,
      descuento_monto: (parseFloat(v.descuento_monto) || 0) - snapshotAcc,
      descuentos_regalos_detalle: label,
      regalo_componentes: componentes,
      regalo_costo_snapshot_usd: snapshotAcc,
      comision_vendedor_pesos: v.comision_vendedor_pesos || 0,
      comision_se_pago: v.comision_se_pago ? true : false,
      entrega: v.entrega ? true : false,
      caja_destino: v.caja_destino || 'Caja Dólares',
      metodo_pago: v.metodo_pago || 'Efectivo USD',
      impactar_caja: true,
      observaciones: v.observaciones || ''
    });
setShowModal(true);
  };

  const handleDeleteVenta = async (v) => {
    const detalle = v.item_detalle || 'venta';
    const ok = window.confirm(`¿Borrar la venta "${detalle}"?\n\nSe revierte el stock (el equipo vuelve a "En Stock") y sale el dinero de la caja. Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/ventas/${v.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar la venta');
      await fetchVentasData();
      if (onDataChange) onDataChange();
      alert('Venta eliminada. Stock y caja revertidos.');
    } catch (err) {
      console.error('Error eliminando venta:', err);
      alert('No se pudo eliminar la venta. Probá de nuevo.');
    }
  };

  const seleccionarCombo = (combo) => {
    setModoRegalo(combo.label);
    setFormData(f => ({
      ...f,
      regalo_componentes: combo.keywords || extractKeywords(combo.label),
      regalo_costo_snapshot_usd: 0,
      descuentos_regalos_detalle: combo.label
    }));
  };

  const guardarCombo = async () => {
    const label = (formData.descuentos_regalos_detalle || '').trim();
    if (!label) return;
    if (combosRegalo.some(c => c.label === label)) {
      alert('Esa opción ya existe entre los accesorios bonificados.');
      seleccionarCombo({ label, keywords: extractKeywords(label) });
      return;
    }
    const nuevo = { label, keywords: extractKeywords(label) };
    const proximos = [...combosExtra, nuevo];
    setCombosExtra(proximos);
    setModoRegalo(label);
    setFormData(f => ({ ...f, regalo_componentes: nuevo.keywords }));
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combos_regalos: JSON.stringify(proximos.map(c => ({ label: c.label }))) })
      });
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Error guardando combo de regalos:", err);
    }
  };

  // Cálculos en vivo
  const cotizActual = parseFloat(formData.cotizacion_dolar) || dolarCotiz;
  const pUSD = parseFloat(formData.precio_venta_usd) || (parseFloat(formData.precio_venta_pesos) / cotizActual) || 0;
  const pPesos = parseFloat(formData.precio_venta_pesos) || (pUSD * cotizActual) || 0;
  const cUSD = parseFloat(formData.costo_total_usd) || 0;
  const cRep = parseFloat(formData.costo_reparacion) || 0;
  const regaloKeywords = Array.isArray(formData.regalo_componentes) ? formData.regalo_componentes : [];

  // Costo ACTUAL de los accesorios bonificados, tomado del stock de "Accesorios y Repuestos".
  // Si ese stock se recalibra, el monto a descontar se actualiza solo.
  const costoAccesoriosUSD = regaloKeywords.reduce((sum, kw) => {
    const match = inventario
      .filter(i => (parseInt(i.stock_actual) || 0) > 0 && i.nombre && i.nombre.toLowerCase().includes(String(kw).toLowerCase()))
      .sort((a, b) => (parseFloat(a.costo_usd) || 0) - (parseFloat(b.costo_usd) || 0))[0];
    if (!match) return sum;
    let c = parseFloat(match.costo_usd) || 0;
    if (!c) c = (parseFloat(match.costo_pesos) || 0) / cotizActual;
    return sum + c;
  }, 0);
  const descManual = parseFloat(formData.descuento_monto) || 0;
  const desc = descManual + costoAccesoriosUSD;

  // Ganancia Neta
  const gananciaNetaUSD = pUSD - cUSD - cRep - desc;
  const gananciaNetaPesos = gananciaNetaUSD * cotizActual;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        precio_venta_usd: pUSD,
        precio_venta_pesos: pPesos,
        descuento_monto: desc,
        regalo_componentes: JSON.stringify(regaloKeywords),
        regalo_costo_snapshot_usd: costoAccesoriosUSD,
        ganancia_usd: gananciaNetaUSD,
        ganancia_pesos: gananciaNetaPesos,
        desglose_pago: pagos.length
          ? pagos
              .filter(p => p.caja && parseFloat(p.monto) > 0)
              .map(p => ({ caja: p.caja, monto: parseFloat(p.monto), moneda: p.moneda || (/pesos/i.test(p.caja) ? 'ARS' : 'USD') }))
          : null
      };

      const res = await fetch(editandoVenta ? `/api/ventas/${editandoVenta.id}` : '/api/ventas', {
        method: editandoVenta ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        if (editandoVenta && saved && saved.venta) {
          setVentas(prev => prev.map(v => (v.id === saved.venta.id ? saved.venta : v)));
        }
        setShowModal(false);
        setEditandoVenta(null);
        setModoRegalo(null);
        setPagos([]);
        // Reset form
        setFormData({
          fecha: hoyInput(),
          dispositivo_id: '',
          dispositivo_seleccionado: null,
          item_detalle: '',
          cliente_nombre: '',
          cliente_contacto: '',
          vendedor_nombre: 'NP',
          moneda_venta: 'USD',
          precio_venta_usd: '',
          precio_venta_pesos: '',
          cotizacion_dolar: dolarCotiz,
          costo_total_usd: 0,
          costo_reparacion: 0,
          descuento_monto: 0,
          descuentos_regalos_detalle: '',
          regalo_componentes: [],
          regalo_costo_snapshot_usd: 0,
          comision_vendedor_pesos: 0,
          comision_se_pago: false,
          entrega: false,
          caja_destino: 'Caja Dólares',
          metodo_pago: 'Efectivo USD',
          impactar_caja: true,
          observaciones: ''
        });
        fetchVentasData();
        if (onDataChange) onDataChange();
      } else {
        const errText = await res.text().catch(() => '');
        console.error("Error guardando venta:", res.status, errText);
        alert(errText || "No se pudo guardar la venta.");
      }
    } catch (err) {
      console.error("Error guardando venta:", err);
      alert("Error al guardar la venta. Revisá la conexión.");
    }
  };

  const dispositivosFiltrados = dispositivosStock.filter(d => 
    d.modelo.toLowerCase().includes(searchDispositivo.toLowerCase()) ||
    (d.imei && d.imei.includes(searchDispositivo)) ||
    (d.color && d.color.toLowerCase().includes(searchDispositivo.toLowerCase())) ||
    (d.capacidad && d.capacidad.toLowerCase().includes(searchDispositivo.toLowerCase()))
  );

  const mesesDisponibles = useMemo(() => {
    const keys = [...new Set((ventas || []).map(v => keyMes(v.fecha)))];
    const hoy = keyMes();
    if (!keys.includes(hoy)) keys.push(hoy);
    return keys.sort().reverse().map(k => ({ key: k, label: labelMes(k) }));
  }, [ventas]);

  const ventasMes = (mesSeleccionado ? (ventas || []).filter(v => keyMes(v.fecha) === mesSeleccionado) : (ventas || []))
    .slice()
    .sort((a, b) => {
      const d = new Date(a.fecha) - new Date(b.fecha);
      return ordenVentas === 'fecha_desc' ? -d : d;
    });

  // Métricas del mes: 2 vendedores (NP / MARDEL), equipos vendidos y ganancia por vendedor
  const statsVentas = useMemo(() => {
    const ventasDelMes = ventasMes.length;
    const porVendedor = {};
    let gananciaNP = 0, gananciaMardel = 0, gananciaOtros = 0;
    (ventasMes || []).forEach(v => {
      let vendedor = (v.vendedor_nombre || 'NP').trim();
      if (vendedor.toUpperCase() === 'MARDEL') vendedor = 'MARDEL';
      porVendedor[vendedor] = (porVendedor[vendedor] || 0) + 1;
      const gan = parseFloat(v.ganancia_usd) || 0;
      if (vendedor === 'NP') gananciaNP += gan;
      else if (vendedor === 'MARDEL') gananciaMardel += gan;
      else gananciaOtros += gan;
    });
    const np = porVendedor['NP'] || 0;
    const mardel = porVendedor['MARDEL'] || 0;
    const otros = ventasDelMes - np - mardel;
    const pct = (n) => (ventasDelMes > 0 ? Math.round((n / ventasDelMes) * 100) : 0);
    return {
      ventasDelMes, np, mardel, otros,
      pctNP: pct(np), pctMardel: pct(mardel), pctOtros: pct(otros),
      gananciaNP, gananciaMardel, gananciaOtros,
      pesosVendidos: (gananciaNP + gananciaMardel + gananciaOtros)
    };
  }, [ventasMes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-sky-400" />
            Facturación & Ventas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Factura dispositivos eligiendo directamente del stock disponible para descontarlo automáticamente.
          </p>
        </div>
        <button
          onClick={() => {
            setSearchDispositivo('');
            setEditandoVenta(null);
            setModoRegalo(null);
            setPagos([]);
            setShowModal(true);
          }}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </button>
      </div>

      {/* Métricas y gráfico por vendedor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-6">
      {/* Historial de Ventas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-200 flex items-center flex-wrap gap-2">
            Historial de Ventas
            <select
              value={mesSeleccionado || ''}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              title="Filtrar por mes"
              className="bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {mesesDisponibles.length === 0 && <option value="">SELECCIONAR MES</option>}
              {mesesDisponibles.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <span className="text-slate-400 font-normal">({ventasMes.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={ordenVentas}
              onChange={(e) => setOrdenVentas(e.target.value)}
              title="Ordenar por fecha"
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="fecha_desc">Más recientes primero ↓</option>
              <option value="fecha_asc">Más antiguas primero ↑</option>
            </select>
            <div className="text-xs text-slate-400">
              Ganancia Total: <span className="text-emerald-400 font-bold">${ventasMes.reduce((acc, v) => acc + (parseFloat(v.ganancia_usd) || 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} USD</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Aún no has registrado ninguna venta. Haz clic en "Nueva Venta" para comenzar.
          </div>
        ) : ventasMes.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No hay ventas en <span className="text-slate-300 font-semibold">{labelMes(mesSeleccionado)}</span>. Elegí "Nueva Venta" para cargar una.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Dispositivo Vendido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4 text-right">Costo USD</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-center">Dólar</th>
                  <th className="py-3 px-4 text-right">Ganancia Neta</th>
                  <th className="py-3 px-4">Caja Destino</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ventasMes.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {fmtFecha(v.fecha)}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                        <span>{v.item_detalle}</span>
                      </div>
                      {v.descuentos_regalos_detalle && (
                        <div className="text-xs text-amber-400/90 font-normal mt-0.5">
                          🎁 {v.descuentos_regalos_detalle} (-${(v.descuento_efectivo_usd ?? v.descuento_monto)} USD)
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{v.cliente_nombre}</div>
                      {v.cliente_contacto && <div className="text-xs text-slate-500">{v.cliente_contacto}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {v.vendedor_nombre}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      ${v.costo_total_usd}
                      {v.costo_reparacion > 0 && <span className="text-[10px] text-amber-400 block">+${v.costo_reparacion} rep</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white font-mono">
                      ${v.precio_venta_usd ? `${v.precio_venta_usd} USD` : `$${v.precio_venta_pesos?.toLocaleString('es-AR')} ARS`}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                      ${v.cotizacion_dolar}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.comision_se_pago ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : null}
                        <span>+${Number(v.ganancia_usd || 0).toFixed(1)} USD</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        (~${v.ganancia_pesos?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {(() => {
                        let legs = [];
                        try { legs = typeof v.desglose_pago === 'string' ? JSON.parse(v.desglose_pago || '[]') : (v.desglose_pago || []); } catch { legs = []; }
                        if (!Array.isArray(legs) || legs.length === 0) return <span>{v.caja_destino}</span>;
                        return legs.map((l, i) => (
                          <div key={i} className="whitespace-nowrap">
                            <span className="text-slate-300 font-semibold">{Number(l.monto).toLocaleString('es-AR')} {l.moneda || 'USD'}</span>
                            <span className="text-slate-500"> → {l.caja}</span>
                          </div>
                        ));
                      })()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditVenta(v)}
                          title="Editar venta"
                          className="p-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVenta(v)}
                          title="Borrar venta (revierte stock y caja)"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Panel lateral: gráfico por vendedor + métricas del mes */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            Ventas por Vendedor
          </h3>
          <Donut npPct={statsVentas.pctNP} mardelPct={statsVentas.pctMardel} otrosPct={statsVentas.pctOtros} />
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                NP
              </span>
              <span className="font-bold text-white">{statsVentas.pctNP}% <span className="text-slate-400 font-normal text-xs">({statsVentas.np} ventas)</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                MARDEL
              </span>
              <span className="font-bold text-white">{statsVentas.pctMardel}% <span className="text-slate-400 font-normal text-xs">({statsVentas.mardel} ventas)</span></span>
            </div>
            {statsVentas.otros > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                  Otros
                </span>
                <span className="font-bold text-white">{statsVentas.pctOtros}% <span className="text-slate-400 font-normal text-xs">({statsVentas.otros} ventas)</span></span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Equipos Vendidos</div>
          <div className="text-3xl font-bold text-white mt-1 font-mono">{statsVentas.ventasDelMes}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {mesSeleccionado ? labelMes(mesSeleccionado) : 'Todos los meses'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ganancia por Vendedor</div>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">NP</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">+${statsVentas.gananciaNP.toLocaleString('es-AR', { maximumFractionDigits: 1 })} USD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">MARDEL</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">+${statsVentas.gananciaMardel.toLocaleString('es-AR', { maximumFractionDigits: 1 })} USD</span>
            </div>
            {statsVentas.otros > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Otros</span>
                <span className="text-sm font-bold text-slate-300 font-mono">+${statsVentas.gananciaOtros.toLocaleString('es-AR', { maximumFractionDigits: 1 })} USD</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-base font-bold text-emerald-400 font-mono">+${statsVentas.pesosVendidos.toLocaleString('es-AR', { maximumFractionDigits: 1 })} USD</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {mesSeleccionado ? labelMes(mesSeleccionado) : 'Todos los meses'}
          </div>
        </div>
      </div>
      </div>

      {/* Modal Facturar Venta con Selector Inteligente de Teléfono */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sky-400" />
                  {editandoVenta ? 'Editar Venta' : 'Facturar Nueva Venta'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editandoVenta
                    ? `Modificando la venta del ${editandoVenta.fecha ? fmtFecha(editandoVenta.fecha) : '-'}. Guardá los cambios y se recalcula la ganancia y la caja destino.`
                    : 'Selecciona el dispositivo exacto de tu stock para descontarlo y cargar sus costos automáticamente.'}
                </p>
              </div>
              <button 
                onClick={() => { setShowModal(false); setEditandoVenta(null); }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Aviso de modo edición */}
              {editandoVenta && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Editando venta #{editandoVenta.id}. Podés corregir cliente, vendedor, precios, costos, descuentos y caja destino. El dispositivo vendido no se modifica.
                  </span>
                </div>
              )}

              {/* Selector de modo: Teléfono de Stock vs Accesorio/Manual */}
              <div className="flex items-center gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setTipoVenta('DISPOSITIVO')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    tipoVenta === 'DISPOSITIVO' 
                      ? 'bg-sky-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Seleccionar Celular del Stock ({dispositivosStock.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoVenta('ACCESORIO_LIBRE');
                    handleSelectDispositivo(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    tipoVenta === 'ACCESORIO_LIBRE' 
                      ? 'bg-sky-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  Accesorio o Carga Manual
                </button>
              </div>

              {/* LISTA / SELECTOR VISUAL DE DISPOSITIVOS EN STOCK */}
              {tipoVenta === 'DISPOSITIVO' && (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      1. Elige el teléfono que se vendió:
                    </span>
                    <div className="relative w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchDispositivo}
                        onChange={e => setSearchDispositivo(e.target.value)}
                        placeholder="Buscar por modelo, IMEI..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {dispositivosFiltrados.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No hay equipos en stock que coincidan con la búsqueda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {dispositivosFiltrados.map(disp => {
                        const isSelected = formData.dispositivo_id === disp.id;
                        return (
                          <div
                            key={disp.id}
                            onClick={() => handleSelectDispositivo(disp)}
                            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-left ${
                              isSelected 
                                ? 'bg-sky-600/15 border-sky-500 shadow-md ring-1 ring-sky-500' 
                                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                                {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                                <span>{disp.modelo}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>{disp.capacidad}</span>
                                <span>•</span>
                                <span>{disp.color}</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-medium">Bat: {disp.bateria ? `${disp.bateria}%` : 'N/A'}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                                IMEI: {disp.imei || 'Sin IMEI'}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-slate-200 font-mono">
                                Costo: ${disp.costo_usd}
                              </div>
                              <div className="text-[11px] font-bold text-emerald-400 font-mono mt-0.5">
                                PVP: ${disp.precio_sugerido_usd} USD
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {formData.dispositivo_seleccionado && (
                    <div className="p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-xl text-xs text-sky-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <span>Dispositivo vinculado: <strong>{formData.item_detalle}</strong></span>
                      </div>
                      <span className="text-[10px] uppercase font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
                        Listo para facturar
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Si es manual o accesorio */}
              {tipoVenta === 'ACCESORIO_LIBRE' && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase">
                      Detalle del Artículo / Accesorio *
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.entrega}
                        onChange={e => setFormData({ ...formData, entrega: e.target.checked })}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      ¿Entrega?
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.item_detalle}
                    onChange={e => setFormData({ ...formData, item_detalle: e.target.value })}
                    placeholder="ej. 2x Cargadores 20W + Funda MagSafe"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Datos del Cliente y Vendedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Fecha de la venta
                  </label>
                  <input
                    type="date"
                    value={formData.fecha || hoyInput()}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    title="Hoy por defecto. Podés cambiarla manualmente."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cliente_nombre}
                    onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    placeholder="Cliente compra"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Contacto / Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.cliente_contacto}
                    onChange={e => setFormData({ ...formData, cliente_contacto: e.target.value })}
                    placeholder="ej. 2234985535"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Vendedor
                  </label>
                  <select
                    value={formData.vendedor_nombre}
                    onChange={e => setFormData({ ...formData, vendedor_nombre: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500"
                  >
                    {vendedores.map(vend => (
                      <option key={vend.id} value={vend.nombre}>{vend.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Costos, Precios y Dólar */}
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  2. Condiciones Económicas y Márgenes
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Costo Base Equipo (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.costo_total_usd}
                      onChange={e => setFormData({ ...formData, costo_total_usd: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Costo Reparación (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.costo_reparacion}
                      onChange={e => setFormData({ ...formData, costo_reparacion: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cotización Dólar ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.cotizacion_dolar}
                      onChange={e => {
                        const nuevaCotiz = parseFloat(e.target.value) || 1;
                        setFormData({
                          ...formData,
                          cotizacion_dolar: e.target.value,
                          precio_venta_pesos: pUSD ? (pUSD * nuevaCotiz).toFixed(0) : formData.precio_venta_pesos
                        });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Precio Venta Acordado (USD) *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.precio_venta_usd}
                      onChange={e => {
                        const usd = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          precio_venta_usd: e.target.value,
                          precio_venta_pesos: usd > 0 ? (usd * cotizActual).toFixed(0) : ''
                        });
                      }}
                      placeholder="0 USD"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Precio Venta (Equivalente PESOS)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.precio_venta_pesos}
                      onChange={e => {
                        const ars = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          precio_venta_pesos: e.target.value,
                          precio_venta_usd: ars > 0 ? (ars / cotizActual).toFixed(1) : ''
                        });
                      }}
                      placeholder="0 ARS"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Descuentos o Bonificaciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs text-slate-400 mb-1">Accesorios Bonificados / Regalos</label>
                    <div className="flex flex-wrap gap-1.5">
                      {combosRegalo.map(c => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => seleccionarCombo(c)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
                            modoRegalo === c.label
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => regaloInputRef.current?.focus()}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
                          modoRegalo === 'custom'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/40'
                        }`}
                      >
                        ✏️ Escribir otro...
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={regaloInputRef}
                        type="text"
                        value={formData.descuentos_regalos_detalle}
                        onChange={e => {
                          const txt = e.target.value;
                          setFormData(f => ({
                            ...f,
                            descuentos_regalos_detalle: txt,
                            regalo_componentes: extractKeywords(txt)
                          }));
                          setModoRegalo(txt ? 'custom' : null);
                        }}
                        placeholder="ej. Auricular + Vidrio"
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); guardarCombo(); }
                        }}
                        className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={guardarCombo}
                        className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium bg-slate-700 hover:bg-emerald-600 text-white transition"
                        title="Guardar como opción permanente"
                      >
                        Guardar
                      </button>
                    </div>

                    {formData.descuentos_regalos_detalle ? (
                      costoAccesoriosUSD > 0 ? (
                        <div className="text-xs text-emerald-300">
                          Costo de regalos descontado del stock:{' '}
                          <span className="font-bold text-emerald-400">-${costoAccesoriosUSD.toFixed(2)} USD</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          No se encontró el costo en "Accesorios y Repuestos" (sin stock cargado o sin costo). Se descuenta $0.
                        </div>
                      )
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Descuento Extra (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.descuento_monto}
                      onChange={e => setFormData({ ...formData, descuento_monto: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                {/* Resumen en vivo de Ganancia */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-emerald-300 font-semibold">
                    Ganancia Neta Real de la Venta:
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400 font-mono">+${gananciaNetaUSD.toFixed(1)} USD</span>
                    <span className="text-xs text-emerald-500 block font-mono">
                      (~${gananciaNetaPesos.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS)
                    </span>
                  </div>
                </div>
              </div>

              {/* Abono (cómo se paga) & Comisión */}
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    ¿Cómo se abona? (una caja por pago)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPagos([
                        { caja: 'Caja Dólares', monto: pUSD || 0, moneda: 'USD' },
                        { caja: 'Caja Pesos', monto: pPesos || 0, moneda: 'ARS' }
                      ])}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-sky-500 hover:text-white transition"
                      title="Carga el total dividido en USD (Caja Dólares) y pesos (Caja Pesos), editable"
                    >
                      Auto: USD + Pesos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const libres = cajas.filter(cn => !pagos.some(p => p.caja === cn.nombre));
                        const nueva = libres[0] || cajas[0];
                        if (!nueva) return;
                        setPagos(p => [...p, { caja: nueva.nombre, monto: 0, moneda: nueva.moneda }]);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white transition"
                      title="Agregar otra forma de pago (otra caja)"
                    >
                      + Agregar caja
                    </button>
                  </div>
                </div>

                {pagos.length === 0 ? (
                  <div className="text-[11px] text-slate-500 border border-dashed border-slate-700 rounded-xl px-3 py-2">
                    Sin pagos definidos. Se registra todo en <b className="text-slate-300">Caja Dólares</b> (USD). Usá "Auto" si la venta se abona en USD y pesos.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagos.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={p.caja}
                          onChange={e => {
                            const cn = cajas.find(c => c.nombre === e.target.value);
                            setPagos(prev => prev.map((x, idx) => idx === i ? { ...x, caja: e.target.value, moneda: cn ? cn.moneda : x.moneda } : x));
                          }}
                          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500"
                        >
                          {cajas.map(c => (
                            <option key={c.id} value={c.nombre}>{c.nombre} ({c.moneda})</option>
                          ))}
                        </select>
                        <div className="relative flex-1 min-w-0">
                          <input
                            type="number"
                            step="any"
                            value={p.monto}
                            onChange={e => setPagos(prev => prev.map((x, idx) => idx === i ? { ...x, monto: e.target.value } : x))}
                            placeholder="0"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-sky-500"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-sans">{p.moneda}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPagos(prev => prev.filter((_, idx) => idx !== i))}
                          title="Quitar este pago"
                          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="text-[11px] text-slate-500">
                      Cada forma de pago entra a su caja y el movimiento queda enlazado a la venta con el detalle de abono.
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300 uppercase">
                      Comisión del Vendedor ($ ARS)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.comision_se_pago}
                        onChange={e => setFormData({ ...formData, comision_se_pago: e.target.checked })}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      ¿Se pagó?
                    </label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={formData.comision_vendedor_pesos}
                    onChange={e => setFormData({ ...formData, comision_vendedor_pesos: e.target.value })}
                    placeholder="ej. 20000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditandoVenta(null); }}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition text-sm"
                >
                  {editandoVenta ? 'Guardar Cambios' : 'Confirmar Venta y Descontar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

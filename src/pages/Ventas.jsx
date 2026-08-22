import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, DollarSign, Smartphone, User, CheckCircle2, ShieldCheck, Tag, Search, Check, Sparkles } from 'lucide-react';

export default function Ventas({ config, onDataChange }) {
  const [ventas, setVentas] = useState([]);
  const [dispositivosStock, setDispositivosStock] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchDispositivo, setSearchDispositivo] = useState('');
  const [tipoVenta, setTipoVenta] = useState('DISPOSITIVO'); // 'DISPOSITIVO' o 'ACCESORIO_LIBRE'

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  // Form State
  const [formData, setFormData] = useState({
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
    comision_vendedor_pesos: 0,
    caja_destino: 'Caja Fuerte Dólares',
    metodo_pago: 'Efectivo USD',
    impactar_caja: true,
    observaciones: ''
  });

  useEffect(() => {
    fetchVentasData();
  }, []);

  const fetchVentasData = async () => {
    try {
      setLoading(true);
      const [resVentas, resDisp, resVend, resCajas] = await Promise.all([
        fetch('/api/ventas').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/dispositivos').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/vendedores').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/cajas').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const v = (resVentas && Array.isArray(resVentas) && resVentas.length > 0) ? resVentas : (fallbackData.ventas || []);
      const d = (resDisp && Array.isArray(resDisp) && resDisp.length > 0) ? resDisp : (fallbackData.dispositivos || []);
      const vend = (resVend && Array.isArray(resVend) && resVend.length > 0) ? resVend : (fallbackData.vendedores || []);
      const c = (resCajas && Array.isArray(resCajas) && resCajas.length > 0) ? resCajas : (fallbackData.cuentas_caja || []);

      setVentas(v);
      setDispositivosStock(d.filter(item => item.estado === 'En Stock' || item.estado === 'Señado'));
      setVendedores(vend);
      setCajas(c);
    } catch (err) {
      console.error("Error fetching data:", err);
      setVentas(fallbackData.ventas || []);
      setDispositivosStock((fallbackData.dispositivos || []).filter(item => item.estado === 'En Stock' || item.estado === 'Señado'));
      setVendedores(fallbackData.vendedores || []);
      setCajas(fallbackData.cuentas_caja || []);
    } finally {
      setLoading(false);
    }
  };

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

  // Cálculos en vivo
  const cotizActual = parseFloat(formData.cotizacion_dolar) || dolarCotiz;
  const pUSD = parseFloat(formData.precio_venta_usd) || (parseFloat(formData.precio_venta_pesos) / cotizActual) || 0;
  const pPesos = parseFloat(formData.precio_venta_pesos) || (pUSD * cotizActual) || 0;
  const cUSD = parseFloat(formData.costo_total_usd) || 0;
  const cRep = parseFloat(formData.costo_reparacion) || 0;
  const desc = parseFloat(formData.descuento_monto) || 0;
  
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
        ganancia_usd: gananciaNetaUSD,
        ganancia_pesos: gananciaNetaPesos
      };

      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        // Reset form
        setFormData({
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
          comision_vendedor_pesos: 0,
          caja_destino: 'Caja Fuerte Dólares',
          metodo_pago: 'Efectivo USD',
          impactar_caja: true,
          observaciones: ''
        });
        fetchVentasData();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error guardando venta:", err);
    }
  };

  const dispositivosFiltrados = dispositivosStock.filter(d => 
    d.modelo.toLowerCase().includes(searchDispositivo.toLowerCase()) ||
    (d.imei && d.imei.includes(searchDispositivo)) ||
    (d.color && d.color.toLowerCase().includes(searchDispositivo.toLowerCase())) ||
    (d.capacidad && d.capacidad.toLowerCase().includes(searchDispositivo.toLowerCase()))
  );

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
            setShowModal(true);
          }}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </button>
      </div>

      {/* Historial de Ventas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-200">Historial de Ventas ({ventas.length})</div>
          <div className="text-xs text-slate-400">
            Ganancia Total: <span className="text-emerald-400 font-bold">${ventas.reduce((acc, v) => acc + (parseFloat(v.ganancia_usd) || 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })} USD</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Aún no has registrado ninguna venta. Haz clic en "Nueva Venta" para comenzar.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ventas.slice().reverse().map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(v.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                        <span>{v.item_detalle}</span>
                      </div>
                      {v.descuentos_regalos_detalle && (
                        <div className="text-xs text-amber-400/90 font-normal mt-0.5">
                          🎁 {v.descuentos_regalos_detalle} (-${v.descuento_monto} USD)
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
                      +${v.ganancia_usd?.toFixed(1)} USD
                      <span className="text-[10px] text-slate-400 block font-normal">
                        (~${v.ganancia_pesos?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {v.caja_destino}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Facturar Venta con Selector Inteligente de Teléfono */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-sky-400" />
                  Facturar Nueva Venta
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona el dispositivo exacto de tu stock para descontarlo y cargar sus costos automáticamente.
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Detalle del Artículo / Accesorio *
                  </label>
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
                    Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cliente_nombre}
                    onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    placeholder="Nombre y Apellido"
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
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Accesorios Bonificados / Regalos</label>
                    <input
                      type="text"
                      value={formData.descuentos_regalos_detalle}
                      onChange={e => setFormData({ ...formData, descuentos_regalos_detalle: e.target.value })}
                      placeholder="ej. Templado + Funda Silicona"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valor Descuento / Regalo (USD)</label>
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

              {/* Caja Destino & Comisión */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Caja Destino (Ingreso del Dinero)
                  </label>
                  <select
                    value={formData.caja_destino}
                    onChange={e => setFormData({ ...formData, caja_destino: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-sky-500"
                  >
                    {cajas.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre} ({c.moneda})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Comisión del Vendedor ($ ARS)
                  </label>
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition text-sm"
                >
                  Confirmar Venta y Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

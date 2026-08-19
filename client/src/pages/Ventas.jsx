import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, DollarSign, Smartphone, User, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';

export default function Ventas({ config, onDataChange }) {
  const [ventas, setVentas] = useState([]);
  const [dispositivosStock, setDispositivosStock] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  // Form State
  const [formData, setFormData] = useState({
    dispositivo_id: '',
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
        fetch('/api/ventas').then(r => r.json()),
        fetch('/api/dispositivos').then(r => r.json()),
        fetch('/api/vendedores').then(r => r.json()),
        fetch('/api/cajas').then(r => r.json())
      ]);
      setVentas(resVentas || []);
      setDispositivosStock((resDisp || []).filter(d => d.estado === 'En Stock' || d.estado === 'Señado'));
      setVendedores(resVend || []);
      setCajas(resCajas || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Al seleccionar un dispositivo de la lista de stock
  const handleSelectDispositivo = (e) => {
    const dispId = e.target.value;
    if (!dispId) {
      setFormData(prev => ({
        ...prev,
        dispositivo_id: '',
        item_detalle: '',
        costo_total_usd: 0,
        costo_reparacion: 0,
        precio_venta_usd: '',
        precio_venta_pesos: ''
      }));
      return;
    }

    const disp = dispositivosStock.find(d => d.id === parseInt(dispId));
    if (disp) {
      const pUSD = disp.precio_sugerido_usd || 0;
      setFormData(prev => ({
        ...prev,
        dispositivo_id: disp.id,
        item_detalle: `${disp.modelo} ${disp.capacidad || ''} ${disp.color || ''} (IMEI: ${disp.imei ? disp.imei.slice(-6) : 'S/N'})`,
        costo_total_usd: disp.costo_usd || 0,
        costo_reparacion: disp.costo_reparacion_usd || 0,
        precio_venta_usd: pUSD || '',
        precio_venta_pesos: pUSD ? (pUSD * dolarCotiz).toFixed(0) : ''
      }));
    }
  };

  // Cálculos en vivo
  const pUSD = parseFloat(formData.precio_venta_usd) || (parseFloat(formData.precio_venta_pesos) / (parseFloat(formData.cotizacion_dolar) || dolarCotiz)) || 0;
  const pPesos = parseFloat(formData.precio_venta_pesos) || (pUSD * (parseFloat(formData.cotizacion_dolar) || dolarCotiz)) || 0;
  const cUSD = parseFloat(formData.costo_total_usd) || 0;
  const cRep = parseFloat(formData.costo_reparacion) || 0;
  const desc = parseFloat(formData.descuento_monto) || 0;
  const gananciaNetaUSD = pUSD - cUSD - cRep - desc;
  const gananciaNetaPesos = gananciaNetaUSD * (parseFloat(formData.cotizacion_dolar) || dolarCotiz);

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
        fetchVentasData();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error guardando venta:", err);
    }
  };

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
            Registro de ventas de celulares y accesorios, cálculo automático de costo, ganancia neta y comisiones.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
        </button>
      </div>

      {/* Tabla de Historial de Ventas */}
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
                  <th className="py-3 px-4">Dispositivo / Detalle</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Vendedor</th>
                  <th className="py-3 px-4 text-right">Costo USD</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-center">Dólar</th>
                  <th className="py-3 px-4 text-right">Ganancia Neta</th>
                  <th className="py-3 px-4">Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ventas.slice().reverse().map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(v.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {v.item_detalle}
                      {v.descuentos_regalos_detalle && (
                        <div className="text-xs text-amber-400/90 font-normal mt-0.5">
                          🎁 {v.descuentos_regalos_detalle} (-${v.descuento_monto})
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

      {/* Modal Nueva Venta */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-sky-400" />
                Registrar Nueva Venta
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selección de Dispositivo en Stock */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Vender Dispositivo de Stock (Opcional)
                </label>
                <select
                  value={formData.dispositivo_id}
                  onChange={handleSelectDispositivo}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Carga manual o Accesorio --</option>
                  {dispositivosStock.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.modelo} {d.capacidad} {d.color} (Bat: {d.bateria ? `${d.bateria}%` : 'N/A'}) - Costo: ${d.costo_usd} USD
                    </option>
                  ))}
                </select>
              </div>

              {/* Detalle del producto vendido */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Detalle del Equipo / Accesorio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_detalle}
                  onChange={e => setFormData({ ...formData, item_detalle: e.target.value })}
                  placeholder="ej. iPhone 14 Pro Max 256GB Purple"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Nombre Cliente
                  </label>
                  <input
                    type="text"
                    value={formData.cliente_nombre}
                    onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    placeholder="ej. Juan Pérez / Cliente NP"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Vendedor Asignado
                  </label>
                  <select
                    value={formData.vendedor_nombre}
                    onChange={e => setFormData({ ...formData, vendedor_nombre: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {vendedores.map(vend => (
                      <option key={vend.id} value={vend.nombre}>{vend.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Costos y Precios */}
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Cálculo de Precios y Costos</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Costo Base Equipo (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.costo_total_usd}
                      onChange={e => setFormData({ ...formData, costo_total_usd: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
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
                      onChange={e => setFormData({ ...formData, cotizacion_dolar: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold text-emerald-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Precio Venta (USD)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.precio_venta_usd}
                      onChange={e => {
                        const usd = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          precio_venta_usd: e.target.value,
                          precio_venta_pesos: (usd * (parseFloat(formData.cotizacion_dolar) || dolarCotiz)).toFixed(0)
                        });
                      }}
                      placeholder="0 USD"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Precio Venta (PESOS)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.precio_venta_pesos}
                      onChange={e => {
                        const ars = parseFloat(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          precio_venta_pesos: e.target.value,
                          precio_venta_usd: (ars / (parseFloat(formData.cotizacion_dolar) || dolarCotiz)).toFixed(1)
                        });
                      }}
                      placeholder="0 ARS"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Descuentos o Regalos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Descuentos o Regalos Detalle</label>
                    <input
                      type="text"
                      value={formData.descuentos_regalos_detalle}
                      onChange={e => setFormData({ ...formData, descuentos_regalos_detalle: e.target.value })}
                      placeholder="ej. Funda + Vidrio + Cable"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Monto Descuento / Regalo (USD)</label>
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

                {/* LIVE PREVIEW DE GANANCIA */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-emerald-300 font-semibold">
                    Ganancia Estimada de la Operación:
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400 font-mono">+${gananciaNetaUSD.toFixed(1)} USD</span>
                    <span className="text-xs text-emerald-500 block font-mono">(${gananciaNetaPesos.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS)</span>
                  </div>
                </div>
              </div>

              {/* Caja y Medio de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Caja Destino
                  </label>
                  <select
                    value={formData.caja_destino}
                    onChange={e => setFormData({ ...formData, caja_destino: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {cajas.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre} ({c.moneda})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Comisión Vendedor ($ ARS)
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

              {/* Acciones */}
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
                  Confirmar y Facturar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

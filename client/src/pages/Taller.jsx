import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle, User, Tag } from 'lucide-react';

export default function Taller({ config, onDataChange }) {
  const [reparaciones, setReparaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  const [formData, setFormData] = useState({
    equipo: '',
    imei: '',
    cliente_nombre: '',
    cliente_telefono: '',
    problema_reportado: '',
    diagnostico_tecnico: '',
    tecnico_asignado: 'Rosario Técnica',
    costo_repuesto_usd: '',
    mano_obra_usd: '',
    total_presupuesto_usd: '',
    estado: 'En Taller',
    observaciones: ''
  });

  useEffect(() => {
    fetchReparaciones();
  }, []);

  const fetchReparaciones = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reparaciones');
      const data = await res.json();
      setReparaciones(data || []);
    } catch (err) {
      console.warn("Using fallback reparaciones:", err); setReparaciones(fallbackData.reparaciones || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const repUSD = parseFloat(formData.costo_repuesto_usd) || 0;
      const moUSD = parseFloat(formData.mano_obra_usd) || 0;
      const totUSD = parseFloat(formData.total_presupuesto_usd) || (repUSD + moUSD);

      const payload = {
        ...formData,
        costo_repuesto_usd: repUSD,
        costo_repuesto_pesos: repUSD * dolarCotiz,
        mano_obra_usd: moUSD,
        mano_obra_pesos: moUSD * dolarCotiz,
        total_presupuesto_usd: totUSD,
        total_presupuesto_pesos: totUSD * dolarCotiz
      };

      const res = await fetch('/api/reparaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchReparaciones();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error guardando reparación:", err);
    }
  };

  const handleUpdateEstado = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`/api/reparaciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (res.ok) {
        fetchReparaciones();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error actualizando estado:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            Servicio Técnico & Reparaciones
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Recepción de equipos, órdenes de trabajo, seguimiento de repuestos y técnicos asignados.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-amber-600/30 transition flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Ingresar Equipo a Taller
        </button>
      </div>

      {/* Grid de Reparaciones */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando órdenes de taller...</div>
      ) : reparaciones.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800 text-sm">
          No hay órdenes de reparación activas. Ingresa una nueva orden para comenzar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reparaciones.map(r => (
            <div key={r.id} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base">{r.equipo}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">{r.cliente_nombre} {r.cliente_telefono && `(${r.cliente_telefono})`}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {r.estado}
                  </span>
                </div>

                <div className="mt-3 p-3 bg-slate-800/50 rounded-xl text-xs space-y-1.5 border border-slate-800">
                  <div className="text-slate-300"><strong>Falla:</strong> {r.problema_reportado}</div>
                  <div className="text-slate-400"><strong>Técnico:</strong> {r.tecnico_asignado}</div>
                  {r.imei && <div className="text-slate-400 font-mono"><strong>IMEI:</strong> {r.imei}</div>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Presupuesto</div>
                  <div className="text-base font-bold text-white font-mono">
                    ${r.total_presupuesto_usd} USD
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Rep: ${r.costo_repuesto_usd} | MO: ${r.mano_obra_usd}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {r.estado !== 'Listo para Retirar' && r.estado !== 'Entregado y Cobrado' && (
                    <button
                      onClick={() => handleUpdateEstado(r.id, 'Listo para Retirar')}
                      className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 text-xs font-semibold rounded-lg transition"
                    >
                      Listo
                    </button>
                  )}
                  {r.estado !== 'Entregado y Cobrado' && (
                    <button
                      onClick={() => handleUpdateEstado(r.id, 'Entregado y Cobrado')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Entregar y Cobrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Orden */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                Nueva Orden de Servicio Técnico
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Equipo / Modelo *</label>
                  <input
                    type="text"
                    required
                    value={formData.equipo}
                    onChange={e => setFormData({ ...formData, equipo: e.target.value })}
                    placeholder="ej. iPhone 13 Pro"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">IMEI / Serie</label>
                  <input
                    type="text"
                    value={formData.imei}
                    onChange={e => setFormData({ ...formData, imei: e.target.value })}
                    placeholder="ej. 352..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cliente *</label>
                  <input
                    type="text"
                    required
                    value={formData.cliente_nombre}
                    onChange={e => setFormData({ ...formData, cliente_nombre: e.target.value })}
                    placeholder="Nombre y Apellido"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.cliente_telefono}
                    onChange={e => setFormData({ ...formData, cliente_telefono: e.target.value })}
                    placeholder="ej. 223..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Problema Reportado / Trabajo a realizar *</label>
                <input
                  type="text"
                  required
                  value={formData.problema_reportado}
                  onChange={e => setFormData({ ...formData, problema_reportado: e.target.value })}
                  placeholder="ej. Cambio de pantalla OLED + Batería"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Costo Repuesto (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.costo_repuesto_usd}
                    onChange={e => setFormData({ ...formData, costo_repuesto_usd: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mano de Obra (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.mano_obra_usd}
                    onChange={e => setFormData({ ...formData, mano_obra_usd: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Cobro (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.total_presupuesto_usd}
                    onChange={e => setFormData({ ...formData, total_presupuesto_usd: e.target.value })}
                    placeholder="Auto"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Técnico / Taller Asignado</label>
                <select
                  value={formData.tecnico_asignado}
                  onChange={e => setFormData({ ...formData, tecnico_asignado: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="Rosario Técnica">Rosario Técnica</option>
                  <option value="Apple Becker">Apple Becker</option>
                  <option value="Huevo y Alegre">Huevo y Alegre</option>
                  <option value="Taller Interno">Taller Interno</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-lg shadow-amber-600/30">
                  Ingresar a Taller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

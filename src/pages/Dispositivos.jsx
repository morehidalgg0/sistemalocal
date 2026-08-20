import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { Smartphone, Plus, Search, Filter, Battery, ShieldAlert, CheckCircle, Tag } from 'lucide-react';

export default function Dispositivos({ config, onDataChange }) {
  const [dispositivos, setDispositivos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  const [formData, setFormData] = useState({
    modelo: '',
    color: '',
    capacidad: '128GB',
    bateria: 100,
    imei: '',
    condicion: 'Usado Impecable',
    costo_usd: '',
    costo_reparacion_usd: '',
    precio_sugerido_usd: '',
    proveedor: 'Garden',
    afectar_cc: true,
    estado: 'En Stock',
    detalles: ''
  });

  useEffect(() => {
    fetchDispositivos();
  }, []);

  const fetchDispositivos = async () => {
    try {
      setLoading(true);
      const [resDisp, resCC] = await Promise.all([
        fetch('/api/dispositivos').then(r => r.json()),
        fetch('/api/cuentas-corrientes').then(r => r.json())
      ]);
      setDispositivos(resDisp || []);
      setProveedores((resCC || []).filter(e => e.tipo === 'PROVEEDOR' || e.tipo === 'SOCIO'));
    } catch (err) {
      console.error("Error al cargar dispositivos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costo_usd: parseFloat(formData.costo_usd) || 0,
          costo_reparacion_usd: parseFloat(formData.costo_reparacion_usd) || 0,
          precio_sugerido_usd: parseFloat(formData.precio_sugerido_usd) || 0,
          precio_sugerido_pesos: (parseFloat(formData.precio_sugerido_usd) || 0) * dolarCotiz
        })
      });
      if (res.ok) {
        setShowModal(false);
        fetchDispositivos();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error al registrar dispositivo:", err);
    }
  };

  const filtered = dispositivos.filter(d => {
    const matchesSearch = 
      d.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.imei && d.imei.includes(searchTerm)) ||
      (d.color && d.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.proveedor && d.proveedor.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterEstado === 'ALL') return matchesSearch;
    return matchesSearch && d.estado === filterEstado;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-indigo-400" />
            Stock de Celulares y Equipos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestión individual de iPhones, Samsungs y dispositivos por IMEI, batería, costo y proveedor.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Ingresar Celular
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por modelo, IMEI, color, proveedor..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'En Stock', 'Señado', 'En Taller', 'Vendido'].map(st => (
            <button
              key={st}
              onClick={() => setFilterEstado(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterEstado === st 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Dispositivos */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando inventario de equipos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800 text-sm">
          No se encontraron dispositivos con ese criterio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => {
            const estadoColors = {
              'En Stock': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              'Señado': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
              'En Taller': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              'Vendido': 'bg-slate-800 text-slate-400 border-slate-700'
            };

            return (
              <div key={d.id} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition space-y-4 flex flex-col justify-between shadow-lg">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">{d.modelo}</h3>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{d.capacidad}</span>
                        <span>•</span>
                        <span>{d.color}</span>
                        <span>•</span>
                        <span className="text-indigo-400 font-medium">{d.condicion}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${estadoColors[d.estado] || estadoColors['En Stock']}`}>
                      {d.estado}
                    </span>
                  </div>

                  {/* IMEI & Batería */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Battery className="w-4 h-4 text-emerald-400" />
                      <span>Batería: <strong className="text-white">{d.bateria ? `${d.bateria}%` : 'N/A'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 justify-end">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-[11px] text-slate-300">
                        {d.imei ? `IMEI: ${d.imei.slice(-6)}` : 'Sin IMEI'}
                      </span>
                    </div>
                  </div>

                  {d.detalles && (
                    <div className="mt-2 text-xs text-slate-400 bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                      {d.detalles}
                    </div>
                  )}
                </div>

                {/* Precios & Proveedor */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Costo Base</div>
                    <div className="text-sm font-bold text-slate-300 font-mono">${d.costo_usd} USD</div>
                    {d.costo_reparacion_usd > 0 && (
                      <div className="text-[10px] text-amber-400 font-mono">+${d.costo_reparacion_usd} rep</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase">PVP Sugerido</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      ${d.precio_sugerido_usd} USD
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ~${(d.precio_sugerido_usd * dolarCotiz).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Dispositivo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                Ingresar Equipo al Inventario
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Modelo de Dispositivo *</label>
                <input
                  type="text"
                  required
                  value={formData.modelo}
                  onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="ej. iPhone 15 Pro Max / Samsung S25 Ultra"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Capacidad</label>
                  <select
                    value={formData.capacidad}
                    onChange={e => setFormData({ ...formData, capacidad: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="64GB">64GB</option>
                    <option value="128GB">128GB</option>
                    <option value="256GB">256GB</option>
                    <option value="512GB">512GB</option>
                    <option value="1TB">1TB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                    placeholder="ej. Black / Natural"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Batería %</label>
                  <input
                    type="number"
                    value={formData.bateria}
                    onChange={e => setFormData({ ...formData, bateria: e.target.value })}
                    placeholder="ej. 89"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">IMEI / N° Serie</label>
                  <input
                    type="text"
                    value={formData.imei}
                    onChange={e => setFormData({ ...formData, imei: e.target.value })}
                    placeholder="ej. 354155..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Condición</label>
                  <select
                    value={formData.condicion}
                    onChange={e => setFormData({ ...formData, condicion: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Nuevo Sellado">Nuevo Sellado</option>
                    <option value="Open Box">Open Box</option>
                    <option value="Usado Impecable">Usado Impecable</option>
                    <option value="Usado (Detalles)">Usado (Detalles)</option>
                    <option value="Para Reparar">Para Reparar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Costo Compra (USD) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.costo_usd}
                    onChange={e => setFormData({ ...formData, costo_usd: e.target.value })}
                    placeholder="ej. 500"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Costo Rep. (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.costo_reparacion_usd}
                    onChange={e => setFormData({ ...formData, costo_reparacion_usd: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">PVP Sugerido (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.precio_sugerido_usd}
                    onChange={e => setFormData({ ...formData, precio_sugerido_usd: e.target.value })}
                    placeholder="ej. 650"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Proveedor / Origen</label>
                  <select
                    value={formData.proveedor}
                    onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    {proveedores.map(p => (
                      <option key={p.id} value={p.nombre}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={e => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="En Stock">En Stock</option>
                    <option value="Señado">Señado</option>
                    <option value="En Taller">En Taller</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="afectar_cc"
                  checked={formData.afectar_cc}
                  onChange={e => setFormData({ ...formData, afectar_cc: e.target.checked })}
                  className="rounded bg-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="afectar_cc" className="text-xs text-slate-300">
                  Añadir automáticamente el costo a la <strong>Cuenta Corriente de {formData.proveedor}</strong>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notas / Detalles Técnicos</label>
                <textarea
                  rows="2"
                  value={formData.detalles}
                  onChange={e => setFormData({ ...formData, detalles: e.target.value })}
                  placeholder="ej. Tapa trasera cambiada con láser, pantalla 100% original..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-lg shadow-indigo-600/30">
                  Guardar en Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

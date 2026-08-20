import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, AlertCircle, Tag, CheckCircle2 } from 'lucide-react';

export default function Inventario({ config, onDataChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  const [formData, setFormData] = useState({
    categoria: 'Accesorio',
    nombre: '',
    stock_actual: '',
    stock_minimo: '5',
    costo_pesos: '',
    costo_usd: '',
    precio_venta_pesos: '',
    precio_venta_usd: '',
    ubicacion: 'Local'
  });

  useEffect(() => {
    fetchInventario();
  }, []);

  const fetchInventario = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventario');
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.warn("Using fallback inventario:", err); setItems(fallbackData.inventario_items || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const cPesos = parseFloat(formData.costo_pesos) || 0;
      const cUSD = parseFloat(formData.costo_usd) || (cPesos / dolarCotiz);
      const pPesos = parseFloat(formData.precio_venta_pesos) || 0;
      const pUSD = parseFloat(formData.precio_venta_usd) || (pPesos / dolarCotiz);

      const payload = {
        ...formData,
        stock_actual: parseInt(formData.stock_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 2,
        costo_pesos: cPesos,
        costo_usd: cUSD,
        precio_venta_pesos: pPesos,
        precio_venta_usd: pUSD
      };

      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchInventario();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error guardando item inventario:", err);
    }
  };

  const filtered = items.filter(i => {
    const matches = i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (i.ubicacion && i.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoriaFiltro === 'ALL') return matches;
    return matches && i.categoria === categoriaFiltro;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-sky-400" />
            Accesorios & Repuestos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control de stock de cargadores, fundas, cables, templados, baterías y repuestos.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 transition flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Nuevo Artículo
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o ubicación..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'Accesorio', 'Repuesto'].map(c => (
            <button
              key={c}
              onClick={() => setCategoriaFiltro(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                categoriaFiltro === c 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {c === 'ALL' ? 'Todos' : `${c}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Artículos */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando inventario...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No se encontraron artículos.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Costo Unit.</th>
                  <th className="py-3 px-4 text-right">PVP Sugerido</th>
                  <th className="py-3 px-4">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(item => {
                  const isBajo = item.stock_actual <= item.stock_minimo;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        {item.nombre}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.categoria === 'Accesorio' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'}`}>
                          {item.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono ${isBajo ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {item.stock_actual} un.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ${item.costo_pesos > 0 ? `$${item.costo_pesos.toLocaleString('es-AR')} ARS` : `$${item.costo_usd} USD`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ${item.precio_venta_pesos > 0 ? `$${item.precio_venta_pesos.toLocaleString('es-AR')} ARS` : `$${item.precio_venta_usd} USD`}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {item.ubicacion || 'Local'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Alta Artículo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" />
                Nuevo Artículo
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre / Modelo del Producto *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej. Funda Silicona iPhone 15 Pro"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Accesorio">Accesorio</option>
                    <option value="Repuesto">Repuesto</option>
                    <option value="Herramienta">Herramienta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Mostrador / Taller"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_actual}
                    onChange={e => setFormData({ ...formData, stock_actual: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Stock Mínimo Alerta</label>
                  <input
                    type="number"
                    value={formData.stock_minimo}
                    onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })}
                    placeholder="5"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Costo Unitario ($ ARS)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.costo_pesos}
                    onChange={e => setFormData({ ...formData, costo_pesos: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">PVP Venta ($ ARS)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.precio_venta_pesos}
                    onChange={e => setFormData({ ...formData, precio_venta_pesos: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-5 py-2 rounded-xl text-sm">
                  Guardar Artículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

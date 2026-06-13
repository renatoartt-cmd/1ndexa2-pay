import React, { useState, useRef } from 'react';

import { Upload, FileSpreadsheet, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useData } from '../hooks/useData';
import * as api from '../lib/api';

export function AdminTrades() {
  const { trades, refresh } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const xlsx = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);
        
        if (data.length > 0) {
          setPreview(data.slice(0, 5)); // Show first 5 rows
        } else {
          setError('El archivo Excel está vacío.');
        }
      } catch (err) {
        setError('Error al leer el archivo Excel. Asegúrate de que sea un formato válido (.xlsx o .csv).');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = xlsx.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = xlsx.utils.sheet_to_json(ws);

          const formattedTrades = data.map((row: any) => ({
            ticket: String(row.Ticket || row.ticket || Math.random().toString(36).substring(7)),
            symbol: String(row.Symbol || row.symbol || row.Par || 'UNKNOWN'),
            type: (String(row.Type || row.type || row.Tipo).toLowerCase().includes('buy') ? 'buy' : 'sell') as 'buy' | 'sell',
            volume: Number(row.Volume || row.volume || row.Lote || 0.01),
            openPrice: Number(row.OpenPrice || row['Open Price'] || row.open_price || 0),
            closePrice: Number(row.ClosePrice || row['Close Price'] || row.close_price || 0),
            profit: Number(row.Profit || row.profit || row.Beneficio || 0),
            openTime: String(row.OpenTime || row['Open Time'] || row.open_time || new Date().toISOString()),
            closeTime: String(row.CloseTime || row['Close Time'] || row.close_time || new Date().toISOString()),
          }));

          await api.bulkInsertTrades(formattedTrades);
          await refresh();
          setFile(null);
          setPreview([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          alert('¡Historial importado exitosamente!');
        } catch (err: any) {
          setError(err.message || 'Error importando a la base de datos.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setError('Error general');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileSpreadsheet className="text-brand-primary" />
          Importar Historial de Trading (Copytrading)
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Sube un archivo Excel (.xlsx o .csv) extraído de MetaTrader o tu plataforma de trading.
          El sistema intentará leer las columnas comunes como: Ticket, Symbol, Type, Volume, OpenPrice, ClosePrice, Profit.
        </p>

        <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-brand-primary/50 transition-colors">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-500 mb-3" />
            <span className="text-white font-medium mb-1">Haz clic para seleccionar archivo</span>
            <span className="text-gray-500 text-sm">Formatos soportados: XLS, XLSX, CSV</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200">
            <AlertTriangle className="text-red-400 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {file && !error && (
          <div className="mt-6">
            <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-green-400" />
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-red-400 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {preview.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4 overflow-x-auto">
                <p className="text-sm text-gray-400 mb-2 font-medium">Previsualización de las primeras filas:</p>
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="text-gray-500 border-b border-gray-800">
                    <tr>
                      <th className="pb-2 font-medium">Symbol</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 last:border-0">
                        <td className="py-2">{row.Symbol || row.symbol || row.Par || '-'}</td>
                        <td className="py-2">{row.Type || row.type || row.Tipo || '-'}</td>
                        <td className={`py-2 font-mono ${Number(row.Profit || row.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {row.Profit || row.profit || row.Beneficio || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={isUploading}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-black font-bold py-3 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? 'Importando a la base de datos...' : (
                <>
                  <CheckCircle size={18} />
                  Confirmar Importación
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="glass-card p-6 border border-gray-800">
        <h3 className="text-lg font-bold text-white mb-4">Historial de Operaciones Subidas ({trades.length})</h3>
        {trades.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay operaciones de trading subidas aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="pb-3 font-medium">Ticket</th>
                  <th className="pb-3 font-medium">Símbolo</th>
                  <th className="pb-3 font-medium">Tipo</th>
                  <th className="pb-3 font-medium">Volumen</th>
                  <th className="pb-3 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20">
                    <td className="py-3 text-gray-400 text-xs">{t.ticket}</td>
                    <td className="py-3 font-medium text-white">{t.symbol}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${t.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{t.volume}</td>
                    <td className={`py-3 text-right font-mono font-medium ${t.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.profit > 0 ? '+' : ''}{t.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trades.length > 10 && (
              <p className="text-center text-xs text-gray-500 mt-4 pt-4 border-t border-gray-800">
                Mostrando las últimas 10 operaciones de {trades.length} en total.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

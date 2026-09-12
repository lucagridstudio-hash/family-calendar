import React, { useState } from 'react';
import { previewShifts, saveBatchShifts } from '../services/api';

interface ImportShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: () => void;
}

export const ImportShiftsModal: React.FC<ImportShiftsModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    try {
      const data = await previewShifts(selectedFile);
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || "Errore durante l'anteprima");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (previewData.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await saveBatchShifts(previewData);
      if (onImport) {
        onImport();
      }
      onClose();
      window.location.reload(); // Ricarica la pagina per mostrare i turni aggiornati nel calendario
    } catch (err: any) {
      setError(err.message || "Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Importa Turni da Immagine</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona immagine dei turni:</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {loading && <div className="text-center py-4 text-blue-600 font-medium">Elaborazione in corso con IA...</div>}

        {previewData.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-2 max-h-60">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-2">Data</th>
                  <th className="p-2">Codice</th>
                  <th className="p-2">Orario</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((shift, idx) => (
                  <tr key={shift.date || idx} className="border-b">
                    <td className="p-2">{shift.date}</td>
                    <td className="p-2 font-semibold">{shift.code}</td>
                    <td className="p-2">{shift.start_time} - {shift.end_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-auto pt-4 border-t">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50"
          >
            Annulla
          </button>
          <button 
            onClick={handleConfirm}
            disabled={previewData.length === 0 || loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Salva Turni ({previewData.length})
          </button>
        </div>
      </div>
    </div>
  );
};

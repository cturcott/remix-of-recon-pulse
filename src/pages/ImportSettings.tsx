import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { supabase } from '@/integrations/supabase/client'
import { useDealership } from '@/contexts/DealershipContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

function parseCSV(text: string) { const lines = text.trim().split('\n'); if (lines.length < 2) return []; const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')); return lines.slice(1).filter(l=>l.trim()).map(line => { const vals = line.split(',').map(v=>v.trim().replace(/^"|"$/g,'')); return headers.reduce((obj,h,i) => { (obj as any)[h]=vals[i]||''; return obj },{}) }) }

export default function ImportSettings() {
  const { dealership } = useDealership(); const { profile } = useAuth(); const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false); const [preview, setPreview] = useState<any[]>([]); const [fileName, setFileName] = useState(''); const [importing, setImporting] = useState(false)

  function handleFile(file: File) { if (!file.name.endsWith('.csv')) { toast.error('Please upload a CSV file'); return }; setFileName(file.name); const r = new FileReader(); r.onload = e => setPreview(parseCSV(e.target?.result as string).slice(0,5)); r.readAsText(file) }

  async function handleImport() {
    if (!preview.length || !dealership?.id || !profile?.id) return; setImporting(true)
    try { const { error } = await supabase.from('import_batches').insert({ dealership_id: dealership.id, filename: fileName, imported_by: profile.id, total_rows: preview.length, status: 'processing' }); if (error) throw error; toast.success('Import batch created!'); setPreview([]); setFileName(''); qc.invalidateQueries({ queryKey: ['import-history'] }) } catch (err: any) { toast.error(err.message || 'Import failed') } finally { setImporting(false) }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">CSV Import</h1><p className="text-sm text-gray-500 mt-1">Bulk import vehicles from a spreadsheet export</p></div>
        <div onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f)}} onClick={()=>fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging?'border-teal-400 bg-teal-50':'border-gray-200 hover:border-teal-300'}`}>
          <Upload size={32} className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-medium text-gray-700">Drop your CSV file here, or <span className="text-teal-600">browse</span></p><p className="text-xs text-gray-400 mt-1">Columns: stock_number, vin, year, make, model, trim, color, mileage</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} />
        </div>
        {preview.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><FileText size={15} className="text-teal-500" /><span className="text-sm font-medium text-gray-900">{fileName}</span><span className="text-xs text-gray-400">({preview.length} rows)</span></div><button onClick={handleImport} disabled={importing} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">{importing?'Importing...':'Start Import'}</button></div>
          </div>
        )}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4"><h3 className="text-sm font-semibold text-blue-900 mb-2">Expected CSV Format</h3><code className="text-xs text-blue-700 font-mono">stock_number,vin,year,make,model,trim,color,mileage</code></div>
      </div>
    </AppLayout>
  )
}
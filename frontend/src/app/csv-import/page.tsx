'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TENANT_ID = 'test-shop';

export default function CSVImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    sample_rows: Record<string, string>[];
    total_rows: number;
    suggested_mapping: Record<string, string>;
  } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ingested: number; duplicates_skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    // Preview
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_URL}/csv/preview`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPreview(data);
      setMapping(data.suggested_mapping || {});
    } catch (err) {
      console.error('Preview failed:', err);
      alert('ไม่สามารถอ่านไฟล์ CSV');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/csv/import?tenant_id=${TENANT_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          column_mapping: mapping,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error.message}`);
      } else {
        setResult({
          ingested: data.ingested,
          duplicates_skipped: data.duplicates_skipped,
        });
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import ล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    const res = await fetch(`${API_URL}/csv/template`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">Order Hub</Link>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/orders" className="text-gray-600 hover:text-gray-900">Orders</Link>
            <Link href="/integrations" className="text-gray-600 hover:text-gray-900">Integrations</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Import CSV</h1>

        {/* Template Download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">
            📥 ดาวน์โหลด template CSV เพื่อดูรูปแบบที่รองรับ
          </p>
          <button
            onClick={downloadTemplate}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            ดาวน์โหลด Template
          </button>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            เลือกไฟล์ CSV
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preview ({preview.total_rows} แถว)
            </h2>

            {/* Column Mapping */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mapping</h3>
              <div className="grid grid-cols-2 gap-4">
                {['order_id', 'status', 'total', 'customer_name', 'customer_phone'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 mb-1">{field}</label>
                    <select
                      value={mapping[field] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      <option value="">-- เลือกคอลัมน์ --</option>
                      {preview.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Data */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.sample_rows.map((row, i) => (
                    <tr key={i}>
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-600">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleImport}
                disabled={loading || !mapping.order_id}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'กำลัง Import...' : 'Import'}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Import สำเร็จ!
            </h2>
            <p className="text-green-700">
              นำเข้า {result.ingested} ออเดอร์
              {result.duplicates_skipped > 0 && ` (${result.duplicates_skipped} รายการซ้ำ)`}
            </p>
            <Link href="/orders" className="inline-block mt-4 text-blue-600 hover:text-blue-800">
              ดูออเดอร์ทั้งหมด →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

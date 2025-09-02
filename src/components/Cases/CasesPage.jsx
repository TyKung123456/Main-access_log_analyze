import React, { useEffect, useState } from 'react';

const CasesPage = () => {
  const [caseList, setCaseList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ id: null, rows: [], count: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/security/cases/list');
        const data = await res.json();
        setCaseList(data.cases || []);
      } catch (e) {
        setError('โหลดรายการเคสไม่สำเร็จ');
      }
    })();
  }, []);

  const runCase = async (id) => {
    setSelectedId(id);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/security/cases?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setResult({ id, rows: data.rows || [], count: data.count || 0 });
    } catch (e) {
      setError('ดึงข้อมูลไม่สำเร็จ');
      setResult({ id, rows: [], count: 0 });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result.rows || result.rows.length === 0) return;
    const metaTitle = caseList.find(c => c.id === result.id)?.title || 'รายงานเคส';
    const headers = Object.keys(result.rows[0] || {});

    const escape = (val) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const meta = [
      ['รายงาน', metaTitle],
      ['รหัสเคส', result.id],
      ['สร้างเมื่อ', new Date().toLocaleString('th-TH')],
      ['จำนวนระเบียน', result.count],
      [],
      ['คำอธิบาย', 'รายงานนี้จัดทำเพื่อการตรวจสอบความปลอดภัยของการเข้า–ออกระบบ'],
      [],
    ]
      .map(row => row.map(escape).join(','))
      .join('\n');

    const body = [headers.join(',')]
      .concat((result.rows || []).map(r => headers.map(h => escape(r[h])).join(',')))
      .join('\n');

    const csv = `${meta}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = metaTitle.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9_\- ]/g, '').replace(/\s+/g,'_');
    a.download = `${base || 'case'}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">รายงานตามเคส</h2>
        <div className="flex items-center gap-2">
          <button
            disabled={!result.rows || result.rows.length === 0}
            onClick={exportCSV}
            className={`px-3 py-1.5 rounded-md border text-xs ${result.rows?.length ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
          >
            ส่งออกรายงาน (CSV)
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          {caseList.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีรายการเคส</div>
          ) : caseList.map(c => (
            <button
              key={c.id}
              onClick={() => runCase(c.id)}
              className={`w-full text-left px-3 py-2 rounded border text-sm ${selectedId===c.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="text-sm font-medium text-gray-800">{c.title}</div>
              <div className="text-xs text-gray-500">{c.category}</div>
            </button>
          ))}
        </div>
        <div className="md:col-span-2">
          {loading ? (
            <div className="text-sm text-gray-500">กำลังดึงข้อมูล...</div>
          ) : result.id ? (
            <div>
              <div className="text-sm text-gray-700 mb-2">ผลลัพธ์: {result.count.toLocaleString('th-TH')} แถว</div>
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {result.rows[0] && Object.keys(result.rows[0]).map((k) => (
                        <th key={k} className="px-2 py-1 text-left text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.rows || []).slice(0,100).map((r, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.keys(r).map(k => (
                          <td key={k} className="px-2 py-1 whitespace-nowrap text-gray-800">{String(r[k] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                    {(!result.rows || result.rows.length===0) && (
                      <tr><td className="px-2 py-4 text-gray-500">ไม่มีข้อมูล</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">เลือกเคสจากด้านซ้ายเพื่อดูผลลัพธ์</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CasesPage;

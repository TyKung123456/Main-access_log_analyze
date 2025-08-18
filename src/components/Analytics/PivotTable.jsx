import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Database, BarChart3, Grid, Download, RefreshCw, AlertCircle, Settings,
  Search, Filter, Eye, EyeOff, ChevronDown, ChevronUp, Copy, Share2,
  Maximize2, Minimize2, RotateCcw, Save, FileText, TrendingUp, PieChart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import usePivotTableData from '../../hooks/usePivotTableData'; // Import the actual hook

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

const PivotTable = () => {
  const { data, loading, error, fetchData } = usePivotTableData();
  const [rowField, setRowField] = useState('');
  const [colField, setColField] = useState('');
  const [valueField, setValueField] = useState('');
  const [aggregationType, setAggregationType] = useState('count');
  const [showTotals, setShowTotals] = useState(true);

  // New enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [showFieldDetails, setShowFieldDetails] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState('bar'); // 'bar', 'pie'
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [compareMode, setCompareMode] = useState(false);
  const [pinnedRows, setPinnedRows] = useState(new Set());
  const [conditionalFormats, setConditionalFormats] = useState([]);
  const [customFormulas, setCustomFormulas] = useState({});
  const [drillDownData, setDrillDownData] = useState(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const availableFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0] || {}).filter(key => !key.startsWith('_') && key !== '__v' && key !== 'timestamp');
  }, [data]);

  const numericFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow || {}).filter(key => {
      const value = firstRow[key];
      return typeof value === 'number' || (!isNaN(Number(value)) && value !== '' && value !== null);
    });
  }, [data]);

  // Apply conditional formatting
  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#000000'; // Default to black if no color
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    const y = (r * 299 + g * 587 + b * 114) / 1000;
    return y >= 128 ? '#000000' : '#FFFFFF';
  };

  const getCellStyle = useCallback((value, header, row) => {
    const style = {};
    conditionalFormats.forEach(format => {
      if (format.field === header) {
        let apply = false;
        const numValue = Number(value);
        const formatValueNum = Number(format.value);

        if (format.type === 'numeric' && !isNaN(numValue) && !isNaN(formatValueNum)) {
          if (format.condition === 'greater' && numValue > formatValueNum) apply = true;
          if (format.condition === 'less' && numValue < formatValueNum) apply = true;
          if (format.condition === 'equal' && numValue === formatValueNum) apply = true;
        } else if (typeof value === 'string' && format.condition === 'contains') {
          if (value.toLowerCase().includes(String(format.value).toLowerCase())) apply = true;
        }

        if (apply) {
          style.backgroundColor = format.color;
          style.color = getContrastColor(format.color);
        }
      }
    });

    // Apply custom formula styling if applicable
    if (customFormulas[header]) {
      const formulaResult = calculateCustomFormula(customFormulas[header], row);
      if (typeof formulaResult === 'number' && formulaResult > 0) { // Example: highlight positive formula results
        style.fontWeight = 'bold';
        style.color = 'green';
      }
    }

    return style;
  }, [conditionalFormats, customFormulas, getContrastColor]);

  // Set default rowField and colField when data loads
  useEffect(() => {
    if (data && data.length > 0 && availableFields.length > 0) {
      if (!rowField && availableFields[0]) { // Ensure availableFields[0] exists
        setRowField(availableFields[0]);
      }
      if (!colField && availableFields.length > 1 && availableFields[1]) { // Ensure availableFields[1] exists
        setColField(availableFields[1]);
      } else if (!colField && availableFields.length === 1 && availableFields[0]) {
        // If only one field, use it for both row and column (or handle as appropriate)
        setColField(availableFields[0]);
      }
    }
  }, [data, availableFields, rowField, colField]);

  // Field statistics
  const fieldStats = useMemo(() => {
    if (!data || data.length === 0) return {};
    const stats = {};

    availableFields.forEach(field => {
      const values = data.map(row => row[field]).filter(v => v != null);
      const uniqueValues = new Set(values);

      stats[field] = {
        count: values.length,
        unique: uniqueValues.size,
        nulls: data.length - values.length,
        type: numericFields.includes(field) ? 'numeric' : 'text'
      };

      if (numericFields.includes(field)) {
        const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        stats[field].min = Math.min(...numValues);
        stats[field].max = Math.max(...numValues);
        stats[field].avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      }
    });

    return stats;
  }, [data, availableFields, numericFields]);

  const pivotData = useMemo(() => {
    if (!data || data.length === 0 || !rowField || !colField) {
      return { headers: [], rows: [], totals: {}, maxValue: 0 };
    }

    let filteredData = data;

    // Apply search filter
    if (searchTerm) {
      filteredData = data.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply field filters
    Object.entries(filterValues).forEach(([field, filterValue]) => {
      if (filterValue) {
        filteredData = filteredData.filter(item =>
          String(item[field]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    const pivot = {};
    const rowHeaders = new Set();
    const colHeaders = new Set();
    const totals = { row: {}, col: {}, grand: 0 };
    let maxValue = 0;

    filteredData.forEach(item => {
      const rowValue = String(item[rowField] ?? 'N/A');
      const colValue = String(item[colField] ?? 'N/A');

      rowHeaders.add(rowValue);
      colHeaders.add(colValue);

      if (!pivot[rowValue]) {
        pivot[rowValue] = {};
      }
      if (!pivot[rowValue][colValue]) {
        pivot[rowValue][colValue] = [];
      }

      pivot[rowValue][colValue].push(item);
    });

    const calculateValue = (items) => {
      if (aggregationType === 'count') {
        return items.length;
      }

      if (!valueField || numericFields.indexOf(valueField) === -1) {
        return items.length;
      }

      const values = items.map(item => Number(item[valueField])).filter(v => !isNaN(v));

      switch (aggregationType) {
        case 'sum':
          return values.reduce((sum, val) => sum + val, 0);
        case 'avg':
          return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
        case 'min':
          return values.length > 0 ? Math.min(...values) : 0;
        case 'max':
          return values.length > 0 ? Math.max(...values) : 0;
        default:
          return values.length;
      }
    };

    const sortedColHeaders = Array.from(colHeaders).sort();
    const sortedRowHeaders = Array.from(rowHeaders).sort();

    // แก้ไข: กรองคอลัมน์ที่ซ่อนออกจาก headers
    const visibleColHeaders = sortedColHeaders.filter(h => !hiddenColumns.has(h));
    const tableHeaders = [rowField, ...visibleColHeaders];
    if (showTotals) {
      tableHeaders.push('Total');
    }

    const tableRows = sortedRowHeaders.map(rowHeader => {
      const row = { [rowField]: rowHeader };
      let rowTotal = 0;

      sortedColHeaders.forEach(colHeader => {
        const items = pivot[rowHeader][colHeader] || [];
        const value = calculateValue(items);

        // แก้ไข: เพิ่มข้อมูลเฉพาะคอลัมน์ที่ไม่ได้ซ่อน
        if (!hiddenColumns.has(colHeader)) {
          row[colHeader] = value;
        }

        rowTotal += value;
        maxValue = Math.max(maxValue, value);

        if (!totals.col[colHeader]) {
          totals.col[colHeader] = 0;
        }
        totals.col[colHeader] += value;
      });

      if (showTotals) {
        row['Total'] = rowTotal;
        totals.row[rowHeader] = rowTotal;
        totals.grand += rowTotal;
        maxValue = Math.max(maxValue, rowTotal);
      }

      return row;
    });

    if (showTotals && tableRows.length > 0) {
      const totalRow = { [rowField]: 'Total' };
      visibleColHeaders.forEach(colHeader => {
        totalRow[colHeader] = totals.col[colHeader] || 0;
      });
      totalRow['Total'] = totals.grand;
      tableRows.push(totalRow);
    }

    // Apply sorting
    if (sortConfig.key) {
      tableRows.sort((a, b) => {
        if (a[rowField] === 'Total') return 1;
        if (b[rowField] === 'Total') return -1;

        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        } else {
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          return sortConfig.direction === 'asc'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
        }
      });
    }

    return { headers: tableHeaders, rows: tableRows, totals, maxValue };
  }, [data, rowField, colField, valueField, aggregationType, showTotals, numericFields, searchTerm, filterValues, hiddenColumns, sortConfig]);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!pivotData.rows || pivotData.rows.length === 0) return [];

    const dataRows = pivotData.rows.filter(row => row[rowField] !== 'Total');

    if (chartType === 'bar') {
      return dataRows.map(row => {
        const item = { name: row[rowField] };
        pivotData.headers.slice(1).forEach(header => {
          if (header !== 'Total' && row[header] !== undefined) {
            item[header] = row[header];
          }
        });
        return item;
      });
    } else if (chartType === 'pie') {
      return dataRows.map((row, index) => ({
        name: row[rowField],
        value: row['Total'] || Object.values(row).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0),
        fill: COLORS[index % COLORS.length]
      }));
    }

    return [];
  }, [pivotData, rowField, chartType]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto refresh effect
  useEffect(() => {
    let intervalId;
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, fetchData]);

  // Export functions
  const exportToJSON = () => {
    if (pivotData.rows.length === 0) return;

    const jsonData = {
      config: { rowField, colField, valueField, aggregationType, showTotals },
      headers: pivotData.headers,
      data: pivotData.rows,
      metadata: {
        totalRows: pivotData.rows.length - (showTotals ? 1 : 0),
        totalColumns: pivotData.headers.length - 1,
        generatedAt: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivot_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (pivotData.rows.length === 0) return;

    // Create CSV format that Excel can read
    const BOM = '\uFEFF'; // UTF-8 BOM for proper encoding
    const csvContent = BOM + [
      pivotData.headers.join(','),
      ...pivotData.rows.map(row =>
        pivotData.headers.map(header => {
          const value = row[header];
          // Wrap in quotes if contains comma or is text
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivot_table_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    if (pivotData.rows.length === 0) return;

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pivot Table Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          .metadata { background: #f5f5f5; padding: 10px; margin: 20px 0; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total-row { background-color: #e3f2fd; font-weight: bold; }
          .numeric { text-align: right; }
        </style>
      </head>
      <body>
        <h1>Pivot Table Report</h1>
        <div class="metadata">
          <strong>Configuration:</strong><br>
          Rows: ${rowField}<br>
          Columns: ${colField}<br>
          Values: ${valueField || 'Count'}<br>
          Function: ${aggregationType}<br>
          Generated: ${new Date().toLocaleString()}
        </div>
        <table>
          <thead>
            <tr>
              ${pivotData.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${pivotData.rows.map(row => {
      const isTotal = row[rowField] === 'Total';
      return `<tr${isTotal ? ' class="total-row"' : ''}>
                ${pivotData.headers.map(header =>
        `<td${typeof row[header] === 'number' ? ' class="numeric"' : ''}>${formatValue(row[header])}</td>`
      ).join('')}
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Conditional formatting functions
  const addConditionalFormat = (field, condition, operator, value, color) => {
    const newFormat = {
      id: Date.now(),
      field,
      condition, // 'greater', 'less', 'equal', 'contains'
      operator,
      value,
      color
    };
    setConditionalFormats(prev => [...prev, newFormat]);
  };

  const removeConditionalFormat = (id) => {
    setConditionalFormats(prev => prev.filter(f => f.id !== id));
  };

  // Custom formula functions
  const addCustomFormula = (name, formula) => {
    setCustomFormulas(prev => ({ ...prev, [name]: formula }));
  };

  const calculateCustomFormula = (formula, row) => {
    try {
      // Simple formula evaluation (can be enhanced)
      let result = formula;
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (typeof value === 'number') {
          result = result.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
        }
      });
      // Basic math evaluation
      if (/^[\d\s+\-*/.()]+$/.test(result)) {
        return eval(result);
      }
      return result;
    } catch (e) {
      return 'Error';
    }
  };

  // Drill-down functions
  const handleCellDrillDown = (rowValue, colValue) => {
    if (!data || data.length === 0) return;

    const drillData = data.filter(item =>
      String(item[rowField]) === String(rowValue) &&
      String(item[colField]) === String(colValue)
    );

    setDrillDownData({
      rowValue,
      colValue,
      data: drillData,
      fields: availableFields
    });
    setShowDrillDown(true);
  };

  const togglePinRow = (rowValue) => {
    setPinnedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowValue)) {
        newSet.delete(rowValue);
      } else {
        newSet.add(rowValue);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterValues({});
    setHiddenColumns(new Set());
    setPinnedRows(new Set());
    setConditionalFormats([]);
  };

  const exportToCSV = () => {
    if (pivotData.rows.length === 0) return;

  const csvContent = [
    pivotData.headers.join(','),
    ...pivotData.rows.map(row =>
      pivotData.headers.map(header => row[header]).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pivot_table_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const copyToClipboard = async () => {
  if (pivotData.rows.length === 0) return;

  const textContent = [
    pivotData.headers.join('\t'),
    ...pivotData.rows.map(row =>
      pivotData.headers.map(header => row[header]).join('\t')
    )
  ].join('\n');

  try {
    await navigator.clipboard.writeText(textContent);
    // You could add a toast notification here
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
};

const saveConfiguration = () => {
  if (!rowField || !colField) return;

  const config = {
    id: Date.now(),
    name: `${rowField} vs ${colField}`,
    rowField,
    colField,
    valueField,
    aggregationType,
    showTotals,
    timestamp: new Date().toISOString()
  };

  setSavedConfigs(prev => [...prev, config]);
};

const loadConfiguration = (config) => {
  setRowField(config.rowField);
  setColField(config.colField);
  setValueField(config.valueField);
  setAggregationType(config.aggregationType);
  setShowTotals(config.showTotals);
};

const resetAll = () => {
  setRowField('');
  setColField('');
  setValueField('');
  setAggregationType('count');
  setShowTotals(true);
  setSearchTerm('');
  setFilterValues({});
  setHiddenColumns(new Set());
  setSortConfig({ key: '', direction: 'asc' });
  setAutoRefresh(false);
  setCompareMode(false);
  setPinnedRows(new Set());
  setConditionalFormats([]);
  setCustomFormulas({});
  setShowDrillDown(false);
};

const handleSort = (column) => {
  setSortConfig(prev => ({
    key: column,
    direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc'
  }));
};

const toggleColumnVisibility = (column) => {
  setHiddenColumns(prev => {
    const newSet = new Set(prev);
    if (newSet.has(column)) {
      newSet.delete(column);
    } else {
      newSet.add(column);
    }
    return newSet;
  });
};

const formatValue = (value) => {
  if (typeof value === 'number') {
    if (aggregationType === 'avg') {
      return value.toFixed(2);
    } else if (valueField && (valueField.includes('amount') || valueField.includes('revenue') || valueField.includes('price') || valueField.includes('cost') || valueField.includes('sales'))) {
      return value.toLocaleString();
    }
  }
  return value;
};

return (
  <div className="min-h-screen bg-gray-50">
    <div className={`${isMobile ? 'px-2' : 'max-w-7xl mx-auto'}`}>

      {/* Mobile Warning */}
      {isMobile && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                📱 Mobile view detected. For the best experience, please use a desktop or rotate your device to landscape mode.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Data Source Control */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database size={18} className="text-blue-600" />
              </div>
              <div>
                <span className="font-semibold text-gray-800">Data Source</span>
                <p className="text-xs text-gray-500">/api/logs</p>
              </div>
            </div>

            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span className="text-sm">{loading ? 'Loading...' : 'Refresh'}</span>
            </button>

            {data.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700 font-medium">
                  {data.length} records
                </span>
              </div>
            )}
          </div>

          {/* Right Side Tools */}
          <div className="flex items-center gap-2">
            {/* Search */}
            {data.length > 0 && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            )}

            {/* Chart Toggle */}
            {pivotData.rows.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowChart(!showChart)}
                  className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${showChart ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                >
                  {showChart ? <EyeOff size={14} /> : <BarChart3 size={14} />}
                  {showChart ? 'Hide Chart' : 'Show Chart'}
                </button>

                {showChart && (
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                  </select>
                )}
              </div>
            )}

            {/* Auto Refresh Control */}
            {data.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 border border-gray-200 rounded-lg">
                <label className="flex items-center gap-1 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Auto
                </label>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>
            )}

            {/* Quick Filter Clear */}
            {(searchTerm || Object.keys(filterValues).some(key => filterValues[key]) || hiddenColumns.size > 0) && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200"
              >
                <Filter size={14} />
                Clear All
              </button>
            )}

            {/* Action Buttons */}
            {pivotData.rows.length > 0 && (
              <>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                >
                  <Copy size={14} />
                  Copy
                </button>

                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200"
                >
                  <Download size={14} />
                  CSV
                </button>

                <div className="relative">
                  <select
                    className="appearance-none px-3 py-2 pr-8 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value === 'json') exportToJSON();
                      else if (e.target.value === 'excel') exportToExcel();
                      else if (e.target.value === 'pdf') exportToPDF();
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" className="text-gray-800">Export</option>
                    <option value="json" className="text-gray-800">JSON</option>
                    <option value="excel" className="text-gray-800">Excel</option>
                    <option value="pdf" className="text-gray-800">PDF</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  onClick={saveConfiguration}
                  className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200"
                >
                  <Save size={14} />
                  Save
                </button>
              </>
            )}

            {/* Reset */}
            {(rowField || colField || searchTerm) && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              <AlertCircle size={16} className="text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Notice</p>
                <p className="text-xs text-yellow-600">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">

        {/* Main Content Area */}
        <div className="grid grid-cols-12 gap-6">

          {/* Left Sidebar - Fields Panel */}
          {data.length > 0 && (
            <div className="col-span-12 lg:col-span-3">
              <Card className="border-0 shadow-lg h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Grid size={18} className="text-gray-600" />
                      Fields
                    </div>
                    <button
                      onClick={() => setShowFieldDetails(!showFieldDetails)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showFieldDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Available Fields ({availableFields.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {availableFields.map(field => (
                        <div
                          key={field}
                          className="group relative"
                        >
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-gray-200 hover:border-blue-300">
                            <span className="font-medium text-gray-700 text-sm">
                              {field}
                            </span>
                            <div className="flex items-center gap-1">
                              {numericFields.includes(field) && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                  123
                                </span>
                              )}
                              {showFieldDetails && (
                                <ChevronDown size={12} className="text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Field Details */}
                          {showFieldDetails && fieldStats[field] && (
                            <div className="mt-1 p-2 bg-white border border-gray-200 rounded text-xs text-gray-600 shadow-sm">
                              <div className="grid grid-cols-2 gap-1">
                                <span>Records: {fieldStats[field].count}</span>
                                <span>Unique: {fieldStats[field].unique}</span>
                                {fieldStats[field].nulls > 0 && (
                                  <span className="col-span-2 text-orange-600">
                                    Nulls: {fieldStats[field].nulls}
                                  </span>
                                )}
                                {fieldStats[field].type === 'numeric' && (
                                  <>
                                    <span>Min: {fieldStats[field].min?.toFixed(1)}</span>
                                    <span>Max: {fieldStats[field].max?.toFixed(1)}</span>
                                    <span className="col-span-2">Avg: {fieldStats[field].avg?.toFixed(2)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="w-2 h-2 bg-blue-100 rounded border"></div>
                      <span>Numeric ({numericFields.length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-100 rounded border"></div>
                      <span>Text ({availableFields.length - numericFields.length})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Saved Configurations */}
              {savedConfigs.length > 0 && (
                <Card className="border-0 shadow-lg mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Save size={18} className="text-purple-600" />
                      Saved Views
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {savedConfigs.map(config => (
                        <div
                          key={config.id}
                          className="p-2 bg-gray-50 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-gray-200 hover:border-purple-300"
                          onClick={() => loadConfiguration(config)}
                        >
                          <div className="text-sm font-medium text-gray-700">
                            {config.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(config.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conditional Formatting */}
              {pivotData.rows.length > 0 && (
                <Card className="border-0 shadow-lg mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1 bg-orange-100 rounded">
                        <Settings size={16} className="text-orange-600" />
                      </div>
                      Conditional Formatting
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <select
                          className="p-2 border border-gray-200 rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              const field = e.target.value;
                              addConditionalFormat(field, 'greater', '>', 0, '#fef3c7');
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Add rule for field...</option>
                          {pivotData.headers.filter(h => h !== rowField).map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </div>

                      {conditionalFormats.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {conditionalFormats.map(format => (
                            <div key={format.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                              <span className="font-medium">{format.field}</span>
                              <span>{format.condition} {format.value}</span>
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: format.color }}
                              ></div>
                              <button
                                onClick={() => removeConditionalFormat(format.id)}
                                className="text-red-600 hover:text-red-800 ml-auto"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Custom Formulas */}
              {pivotData.rows.length > 0 && Object.keys(customFormulas).length > 0 && (
                <Card className="border-0 shadow-lg mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1 bg-indigo-100 rounded">
                        <FileText size={16} className="text-indigo-600" />
                      </div>
                      Custom Formulas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {Object.entries(customFormulas).map(([name, formula]) => (
                        <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{name}</span>
                          <span className="text-gray-600 font-mono text-xs">{formula}</span>
                          <button
                            onClick={() => setCustomFormulas(prev => {
                              const newFormulas = { ...prev };
                              delete newFormulas[name];
                              return newFormulas;
                            })}
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="border-0 shadow-lg mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp size={18} className="text-green-600" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Rows:</span>
                      <span className="font-medium">{pivotData.rows.length - (showTotals ? 1 : 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Columns:</span>
                      <span className="font-medium">{pivotData.headers.length - 1}</span>
                    </div>
                    {showTotals && pivotData.totals.grand > 0 && (
                      <div className="flex justify-between pt-1 border-t border-gray-200">
                        <span className="text-gray-600">Grand Total:</span>
                        <span className="font-bold text-blue-600">{formatValue(pivotData.totals.grand)}</span>
                      </div>
                    )}
                    {searchTerm && (
                      <div className="flex justify-between text-orange-600">
                        <span>Filtered:</span>
                        <span className="font-medium">"{searchTerm}"</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <div className={`${data.length > 0 ? 'col-span-12 lg:col-span-9' : 'col-span-12'}`}>

            {/* Configuration Panel */}
            {data.length > 0 && (
              <Card className="border-0 shadow-lg mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Settings size={18} className="text-purple-600" />
                      Pivot Setup
                    </div>

                    {/* Column Visibility Controls */}
                    {pivotData.headers.length > 2 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Show/Hide:</span>
                        <div className="flex gap-1 flex-wrap">
                          {Array.from(new Set([...pivotData.headers.slice(1)])).filter(header => header !== 'Total').map(header => (
                            <button
                              key={header}
                              onClick={() => toggleColumnVisibility(header)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${hiddenColumns.has(header)
                                ? 'bg-red-100 text-red-700 line-through hover:bg-red-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                }`}
                              title={hiddenColumns.has(header) ? 'Click to show' : 'Click to hide'}
                            >
                              {hiddenColumns.has(header) ? <EyeOff size={12} className="inline mr-1" /> : <Eye size={12} className="inline mr-1" />}
                              {header}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Rows
                      </label>
                      <select
                        value={rowField}
                        onChange={(e) => setRowField(e.target.value)}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                      >
                        <option value="">Drop field here...</option>
                        {availableFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                      {rowField && (
                        <input
                          type="text"
                          placeholder="Filter rows..."
                          value={filterValues[rowField] || ''}
                          onChange={(e) => setFilterValues(prev => ({ ...prev, [rowField]: e.target.value }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-100 focus:border-blue-500"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Columns
                      </label>
                      <select
                        value={colField}
                        onChange={(e) => setColField(e.target.value)}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                      >
                        <option value="">Drop field here...</option>
                        {availableFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                      {colField && (
                        <input
                          type="text"
                          placeholder="Filter columns..."
                          value={filterValues[colField] || ''}
                          onChange={(e) => setFilterValues(prev => ({ ...prev, [colField]: e.target.value }))}
                          className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-100 focus:border-blue-500"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Values
                      </label>
                      <select
                        value={valueField}
                        onChange={(e) => setValueField(e.target.value)}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                      >
                        <option value="">Count records</option>
                        {numericFields.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Function
                      </label>
                      <select
                        value={aggregationType}
                        onChange={(e) => setAggregationType(e.target.value)}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white"
                      >
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showTotals}
                          onChange={(e) => setShowTotals(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">Show totals</span>
                      </label>

                      {Object.keys(filterValues).some(key => filterValues[key]) && (
                        <button
                          onClick={() => setFilterValues({})}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    {pivotData.rows.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {pivotData.rows.length - (showTotals ? 1 : 0)} rows × {pivotData.headers.length - 1} columns
                        {valueField && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {aggregationType} of {valueField}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart Display */}
            {showChart && chartData.length > 0 && (
              <Card className="border-0 shadow-lg mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      {chartType === 'bar' ? <BarChart3 size={20} className="text-purple-600" /> : <PieChart size={20} className="text-purple-600" />}
                    </div>
                    <div>
                      <span className="text-xl font-bold text-gray-800">
                        {chartType === 'bar' ? 'Bar Chart' : 'Pie Chart'} Visualization
                      </span>
                      <p className="text-sm text-gray-600 font-normal">Data visualization of your pivot table</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <ResponsiveContainer width="100%" height={400}>
                      {chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {pivotData.headers.slice(1).filter(h => h !== 'Total').map((header, index) => (
                            <Bar
                              key={header}
                              dataKey={header}
                              fill={COLORS[index % COLORS.length]}
                              name={header}
                            />
                          ))}
                        </BarChart>
                      ) : (
                        <RechartsPieChart>
                          <Tooltip />
                          <Legend />
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {data.length > 0 && rowField && colField && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-orange-50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <BarChart3 size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <span className="text-xl font-bold text-gray-800">Analysis Results</span>
                        <p className="text-sm text-gray-600 font-normal">Your pivot table data</p>
                      </div>
                    </div>

                    {pivotData.rows.length > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">
                          {pivotData.rows.length - (showTotals ? 1 : 0)} rows
                        </div>
                        <div className="text-sm text-gray-600">
                          {pivotData.headers.length - 1} columns
                        </div>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                            {pivotData.headers.map((header, index) => (
                              <th
                                key={index}
                                className="border-r border-gray-300 px-6 py-4 text-left font-bold text-gray-800 last:border-r-0 cursor-pointer hover:bg-gray-200 transition-colors"
                                onClick={() => handleSort(header)}
                              >
                                <div className="flex items-center gap-2">
                                  {index === 0 && <Grid size={16} className="text-gray-600" />}
                                  <span>{header}</span>
                                  {sortConfig.key === header && (
                                    <span className="text-blue-600">
                                      {sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {pivotData.rows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={pivotData.headers.length}
                                className="px-6 py-16 text-center text-gray-500"
                              >
                                <div className="flex flex-col items-center gap-4">
                                  <div className="p-4 bg-gray-100 rounded-full">
                                    <BarChart3 size={32} className="text-gray-400" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
                                    <p className="text-gray-500">
                                      Please select both row and column fields to generate your pivot table.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            pivotData.rows.map((row, rowIndex) => {
                              const isTotal = row[rowField] === 'Total';
                              return (
                                <tr
                                  key={rowIndex}
                                  className={`group transition-all duration-200 ${isTotal
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 font-bold border-t-2 border-blue-300'
                                    : 'hover:bg-gradient-to-r hover:from-gray-25 hover:to-blue-25'
                                    }`}
                                >
                                  {pivotData.headers.map((header, colIndex) => (
                                    <td
                                      key={colIndex}
                                      className={`border-r border-gray-200 px-6 py-4 transition-all duration-200 relative cursor-pointer ${colIndex === 0
                                        ? 'font-semibold text-gray-800 bg-gradient-to-r from-gray-25 to-blue-25'
                                        : 'text-right text-gray-700 hover:bg-blue-50'
                                        } ${header === 'Total'
                                          ? 'bg-gradient-to-r from-blue-25 to-indigo-25 font-semibold text-blue-800 border-l-2 border-blue-300'
                                          : ''
                                        } ${isTotal && colIndex > 0
                                          ? 'text-blue-800 font-bold text-lg'
                                          : ''
                                        } ${pinnedRows.has(row[rowField]) && !isTotal
                                          ? 'bg-yellow-50 border-l-4 border-yellow-400'
                                          : ''
                                        } last:border-r-0`}
                                      style={getCellStyle(row[header], header, row)}
                                      onClick={() => {
                                        if (colIndex > 0 && !isTotal && header !== 'Total') {
                                          handleCellDrillDown(row[rowField], header);
                                        }
                                      }}
                                      title={colIndex > 0 && !isTotal && header !== 'Total' ? 'Click to drill down' : ''}
                                    >
                                      {/* Pin button for first column */}
                                      {colIndex === 0 && !isTotal && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            togglePinRow(row[rowField]);
                                          }}
                                          className={`absolute left-1 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded-full text-xs transition-colors ${pinnedRows.has(row[rowField])
                                              ? 'bg-yellow-400 text-yellow-800 hover:bg-yellow-500'
                                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 opacity-0 group-hover:opacity-100'
                                            }`}
                                          title={pinnedRows.has(row[rowField]) ? 'Unpin row' : 'Pin row'}
                                        >
                                          📌
                                        </button>
                                      )}
                                      <span className="inline-block transition-transform duration-200 group-hover:scale-105">
                                        {/* Custom formula calculation */}
                                        {Object.keys(customFormulas).includes(header)
                                          ? calculateCustomFormula(customFormulas[header], row)
                                          : formatValue(row[header])
                                        }
                                        {/* Drill down indicator */}
                                        {colIndex > 0 && !isTotal && header !== 'Total' && (
                                          <span className="ml-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100">🔍</span>
                                        )}
                                      </span>
                                    </td>
                                  ))}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {pivotData.rows.length > 0 && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-orange-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <BarChart3 size={16} />
                            <span className="font-medium">
                              {pivotData.rows.length - (showTotals ? 1 : 0)} data rows
                            </span>
                          </div>
                          {valueField && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                              {aggregationType} of {valueField}
                            </span>
                          )}
                          {hiddenColumns.size > 0 && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                              {hiddenColumns.size} column(s) hidden
                            </span>
                          )}
                          {pinnedRows.size > 0 && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                              {pinnedRows.size} row(s) pinned
                            </span>
                          )}
                          {autoRefresh && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                              <RefreshCw size={12} className="animate-spin" />
                              Auto-refresh: {refreshInterval}s
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-500">
                          Generated: {new Date().toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Getting Started */}
            {data.length === 0 && !loading && !error && (
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h5 className="font-medium text-yellow-800 mb-2">⚠️ No Data Available</h5>
                      <p className="text-sm text-yellow-700 mb-3">
                        No data is currently loaded. This might be because:
                      </p>
                      <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                        <li>API endpoint is not available</li>
                        <li>Data source is empty</li>
                        <li>Connection error occurred</li>
                      </ul>
                      <button
                        onClick={fetchData}
                        className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Try Loading Demo Data
                      </button>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">How to use this Enhanced Pivot Table:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                        <li>Load data from the server by clicking "Refresh Data"</li>
                        <li>Select a Row Field and Column Field from the dropdown menus</li>
                        <li>Choose a Value Field (for numeric calculations) or leave blank for count</li>
                        <li>Select an aggregation method (Count, Sum, Average, etc.)</li>
                        <li>Use Show/Hide buttons to toggle column visibility</li>
                        <li>Pin important rows with 📌 button</li>
                        <li>Enable charts to visualize your data</li>
                        <li>Add conditional formatting rules</li>
                        <li>Click cells to drill down into detailed data</li>
                        <li>Export to CSV, JSON, Excel, or PDF formats</li>
                      </ol>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-2">🚀 Advanced Features</h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>• <strong>Auto Refresh:</strong> Keep data updated automatically</p>
                        <p>• <strong>Conditional Formatting:</strong> Highlight important values</p>
                        <p>• <strong>Data Drill-down:</strong> Click cells to see detailed records</p>
                        <p>• <strong>Multiple Export Formats:</strong> CSV, JSON, Excel, PDF</p>
                        <p>• <strong>Mobile Responsive:</strong> Works on all devices</p>
                        <p>• <strong>Custom Formulas:</strong> Create calculated fields</p>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h5 className="font-medium text-green-800 mb-2">Data Source</h5>
                      <p className="text-sm text-green-700">
                        This component fetches data from the <code className="bg-green-100 px-1 rounded">/api/logs</code> endpoint.
                        Demo data will be used if the API is not available.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Drill Down Modal */}
      {showDrillDown && drillDownData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Drill Down Details</h3>
                <p className="text-sm text-gray-600">
                  {drillDownData.rowValue} → {drillDownData.colValue} ({drillDownData.data.length} records)
                </p>
              </div>
              <button
                onClick={() => setShowDrillDown(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-auto max-h-[60vh]">
              {drillDownData.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        {drillDownData.fields.map(field => (
                          <th key={field} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {drillDownData.data.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          {drillDownData.fields.map(field => (
                            <td key={field} className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                              {formatValue(record[field])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No detailed records found for this selection.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  const csvContent = [
                    drillDownData.fields.join(','),
                    ...drillDownData.data.map(record =>
                      drillDownData.fields.map(field => record[field]).join(',')
                    )
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `drilldown_${drillDownData.rowValue}_${drillDownData.colValue}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Export Details
              </button>
              <button
                onClick={() => setShowDrillDown(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};

export default PivotTable;

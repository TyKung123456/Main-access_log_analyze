import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Database, BarChart3, Grid, Download, RefreshCw, AlertCircle, Settings,
  Search, Filter, Eye, EyeOff, ChevronDown, ChevronUp, Copy, Share2,
  Maximize2, Minimize2, RotateCcw, Save, FileText, TrendingUp, PieChart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell } from 'recharts';
import usePivotTableData from '../../hooks/usePivotTableData'; // Keep this import

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

const PivotTable = () => {
  const { data, loading, error, fetchData } = usePivotTableData();
  const [rowField, setRowField] = useState('');
  const [colField, setColField] = useState('');
  const [valueField, setValueField] = useState('');
  const [aggregationType, setAggregationType] = useState('count');
  const [showTotals, setShowTotals] = useState(true);

  // New state for enhanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [highlightMode, setHighlightMode] = useState('none'); // 'none', 'heatmap', 'bars'
  const [showFieldDetails, setShowFieldDetails] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState('bar'); // 'bar', 'pie'

  const availableFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter(key => !key.startsWith('_') && key !== '__v' && key !== 'timestamp');
  }, [data]);

  const numericFields = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow).filter(key => {
      const value = firstRow[key];
      return typeof value === 'number' || (!isNaN(Number(value)) && value !== '' && value !== null);
    });
  }, [data]);

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
    setHighlightMode('none');
    setShowChart(false);
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

  const getCellStyle = (value, header) => {
    if (highlightMode === 'none' || header === rowField || typeof value !== 'number') {
      return {};
    }

    if (highlightMode === 'heatmap') {
      const intensity = pivotData.maxValue > 0 ? (value / pivotData.maxValue) : 0;
      return {
        backgroundColor: `rgba(59, 130, 246, ${intensity * 0.6})`,
        color: intensity > 0.5 ? 'white' : 'inherit'
      };
    }

    if (highlightMode === 'bars') {
      const width = pivotData.maxValue > 0 ? (value / pivotData.maxValue) * 100 : 0;
      return {
        background: `linear-gradient(to right, rgba(59, 130, 246, 0.3) ${width}%, transparent ${width}%)`
      };
    }

    return {};
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">

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

              {/* Visualization Toggle */}
              {pivotData.rows.length > 0 && (
                <div className="flex items-center border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setHighlightMode(highlightMode === 'none' ? 'heatmap' : highlightMode === 'heatmap' ? 'bars' : 'none')}
                    className={`p-2 rounded text-xs font-medium transition-colors ${highlightMode !== 'none' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    title="Toggle visualization mode"
                  >
                    {highlightMode === 'heatmap' ? '🔥' : highlightMode === 'bars' ? '📊' : '👁️'}
                  </button>
                </div>
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
                    Export
                  </button>

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

                {/* Quick Stats */}
                {pivotData.rows.length > 0 && (
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
                )}
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
                            <pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={150}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </pie>
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
                                        className={`border-r border-gray-200 px-6 py-4 transition-all duration-200 ${colIndex === 0
                                          ? 'font-semibold text-gray-800 bg-gradient-to-r from-gray-25 to-blue-25'
                                          : 'text-right text-gray-700'
                                          } ${header === 'Total'
                                            ? 'bg-gradient-to-r from-blue-25 to-indigo-25 font-semibold text-blue-800 border-l-2 border-blue-300'
                                            : ''
                                          } ${isTotal && colIndex > 0
                                            ? 'text-blue-800 font-bold text-lg'
                                            : ''
                                          } last:border-r-0`}
                                        style={getCellStyle(row[header], header)}
                                      >
                                        <span className="inline-block transition-transform duration-200 group-hover:scale-105">
                                          {formatValue(row[header])}
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
                      <div>
                        <h4 className="font-medium mb-2">How to use this Pivot Table:</h4>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                          <li>Load data from the server by clicking "Refresh Data"</li>
                          <li>Select a Row Field and Column Field from the dropdown menus</li>
                          <li>Choose a Value Field (for numeric calculations) or leave blank for count</li>
                          <li>Select an aggregation method (Count, Sum, Average, etc.)</li>
                          <li>View your pivot table results and export if needed</li>
                          <li>Use Show/Hide buttons to toggle column visibility</li>
                          <li>Enable charts to visualize your data</li>
                        </ol>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h5 className="font-medium text-blue-800 mb-2">Data Source</h5>
                        <p className="text-sm text-blue-700">
                          This component fetches data from the <code className="bg-blue-100 px-1 rounded">/api/logs</code> endpoint.
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
      </div>
    </div>
  );
};

export default PivotTable;

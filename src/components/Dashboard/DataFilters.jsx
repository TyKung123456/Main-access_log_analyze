import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  MapPin,
  Lock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  FileText,
  RefreshCw,
  Filter,
  X,
  ChevronRight,
  Search,
  Trash2
} from 'lucide-react';
import apiService from '../../services/apiService'; // Import apiService

const LogViewerDashboard = () => {
  // State management
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableDoors, setAvailableDoors] = useState([]);
  const [availableSeverities, setAvailableSeverities] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [filters, setFilters] = useState({
    locations: [],
    doors: [],
    severities: []
  });

  // Fallback data for when API fails
  const fallbackData = {
    severityLevels: ['high', 'medium', 'low'],
    locations: ['Building A', 'Building B', 'Main Entrance', 'Parking Lot'],
    doors: ['Main Door', 'Emergency Exit', 'Side Door', 'Back Door']
  };

  // Get available filter options from actual data
  const filterOptions = useMemo(() => {
    let doorsForSelectedLocations = [];
    if (filters.locations.length > 0) {
      // Get unique doors from all currently loaded logs that match the selected locations
      doorsForSelectedLocations = [...new Set(
        allLogs
          .filter(log => filters.locations.includes(log.location))
          .map(log => log.door)
          .filter(door => door) // Filter out any undefined/null doors
      )].sort();
    } else {
      // If no locations are selected, show all available doors fetched from the API
      doorsForSelectedLocations = availableDoors;
    }

    return {
      locations: availableLocations,
      doors: doorsForSelectedLocations,
      severities: availableSeverities
    };
  }, [availableLocations, availableDoors, availableSeverities, filters.locations, allLogs]);

  // Load logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: logsPerPage,
        locations: filters.locations,
        doors: filters.doors,
        severities: filters.severities,
      };

      console.log('🔄 Loading logs with params:', params);
      const response = await apiService.getLogs(params);
      console.log('✅ Logs loaded successfully:', response);

      setAllLogs(response.logs || []);
      setTotalLogsCount(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / logsPerPage));

    } catch (error) {
      console.error('❌ Error loading logs:', error);
      // Set empty data on error
      setAllLogs([]);
      setTotalLogsCount(0);
      setTotalPages(1);

      // Show user-friendly error message
      alert(`ไม่สามารถโหลดข้อมูล Log ได้: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, logsPerPage, filters]);

  // Load filter options with fallback
  const loadFilterOptions = useCallback(async () => {
    console.log('🔄 Loading filter options...');

    try {
      const [locationsRes, doorsRes, severitiesRes] = await Promise.allSettled([
        apiService.getLocations().catch(() => ({ locations: fallbackData.locations.map(item => ({ value: item })) })),
        apiService.getDoors().catch(() => ({ doors: fallbackData.doors.map(item => ({ value: item })) })),
        apiService.getSeverityLevels().catch(() => ({ severityLevels: fallbackData.severityLevels.map(item => ({ value: item })) }))
      ]);

      // Handle locations
      if (locationsRes.status === 'fulfilled') {
        const locations = locationsRes.value.locations?.map(item => item.value) || fallbackData.locations;
        setAvailableLocations(locations.sort());
        console.log('✅ Locations loaded:', locations);
      } else {
        console.log('⚠️ Using fallback locations');
        setAvailableLocations(fallbackData.locations);
      }

      // Handle doors
      if (doorsRes.status === 'fulfilled') {
        const doors = doorsRes.value.doors?.map(item => item.value) || fallbackData.doors;
        setAvailableDoors(doors.sort());
        console.log('✅ Doors loaded:', doors);
      } else {
        console.log('⚠️ Using fallback doors');
        setAvailableDoors(fallbackData.doors);
      }

      // Handle severities
      if (severitiesRes.status === 'fulfilled') {
        const severities = severitiesRes.value.severityLevels?.map(item => item.value) || fallbackData.severityLevels;
        setAvailableSeverities(severities.sort());
        console.log('✅ Severities loaded:', severities);
      } else {
        console.log('⚠️ Using fallback severities');
        setAvailableSeverities(fallbackData.severityLevels);
      }

    } catch (error) {
      console.error('❌ Error loading filter options, using fallback data:', error);
      // Use all fallback data
      setAvailableLocations(fallbackData.locations);
      setAvailableDoors(fallbackData.doors);
      setAvailableSeverities(fallbackData.severityLevels);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };

      if (filterType === 'locations') {
        // Toggle location selection
        if (prev.locations.includes(value)) {
          newFilters.locations = prev.locations.filter(item => item !== value);
        } else {
          newFilters.locations = [...prev.locations, value];
        }

        // Clear door selection when location changes
        newFilters.doors = [];
      } else if (filterType === 'doors') {
        // Toggle door selection
        if (prev.doors.includes(value)) {
          newFilters.doors = prev.doors.filter(item => item !== value);
        } else {
          newFilters.doors = [...prev.doors, value];
        }
      } else {
        // Handle severity filters
        if (prev[filterType].includes(value)) {
          newFilters[filterType] = prev[filterType].filter(item => item !== value);
        } else {
          newFilters[filterType] = [...prev[filterType], value];
        }
      }

      return newFilters;
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      locations: [],
      doors: [],
      severities: []
    });
  };

  // Get time ago string
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get severity config
  const getSeverityConfig = (severity) => {
    const configs = {
      high: {
        color: 'text-red-600 bg-red-100',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        icon: AlertTriangle,
        label: 'สูง (High)'
      },
      medium: {
        color: 'text-yellow-600 bg-yellow-100',
        borderColor: 'border-yellow-200',
        bgColor: 'bg-yellow-50',
        icon: AlertCircle,
        label: 'กลาง (Medium)'
      },
      low: {
        color: 'text-green-600 bg-green-100',
        borderColor: 'border-green-200',
        bgColor: 'bg-green-50',
        icon: CheckCircle,
        label: 'ต่ำ (Low)'
      }
    };
    return configs[severity] || configs.low;
  };

  // Calculate stats
  const stats = {
    total: totalLogsCount,
    high: allLogs.filter(log => log.severity === 'high').length,
    medium: allLogs.filter(log => log.severity === 'medium').length,
    low: allLogs.filter(log => log.severity === 'low').length
  };

  // Effects
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const autoRefresh = setInterval(loadLogs, 30000);
    return () => clearInterval(autoRefresh);
  }, [loadLogs]);

  // Render log item
  const LogItem = ({ log }) => {
    const severityConfig = getSeverityConfig(log.severity);
    const SeverityIcon = severityConfig.icon;

    return (
      <div
        className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:scale-[1.01] ${severityConfig.borderColor} ${severityConfig.bgColor}`}
        onClick={() => {
          setSelectedLog(log);
          setShowModal(true);
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${severityConfig.color}`}>
                <SeverityIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{log.source}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                    {log.type}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {log.location}
                  </span>
                  <span className="flex items-center">
                    <Lock className="w-3 h-3 mr-1" />
                    {log.door}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(log.timestamp)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">
              {log.message}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {log.details}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    );
  };

  // Render modal
  const Modal = ({ log, isOpen, onClose }) => {
    if (!isOpen || !log) return null;

    const severityConfig = getSeverityConfig(log.severity);
    const SeverityIcon = severityConfig.icon;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">รายละเอียด Log</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${severityConfig.color}`}>
                <SeverityIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{log.message}</h4>
                <p className="text-sm text-gray-600">ID: {log.source}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">ข้อมูลพื้นฐาน</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">เวลา:</span>
                    <span className="font-medium">{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">สถานที่:</span>
                    <span className="font-medium">{log.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ประตู:</span>
                    <span className="font-medium">{log.door}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ประเภท:</span>
                    <span className="font-medium">{log.type}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">ระดับความรุนแรง</h5>
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${log.severity === 'high' ? 'bg-red-500' : log.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                  <span className="font-medium">{severityConfig.label}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">รายละเอียดเพิ่มเติม</h5>
              <div className="bg-white p-3 rounded border font-mono text-sm text-gray-800 whitespace-pre-wrap">
                {log.details}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">ข้อมูลทางเทคนิค</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Source:</span>
                  <span className="font-mono text-blue-900">{log.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Log ID:</span>
                  <span className="font-mono text-blue-900">{log.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Timestamp:</span>
                  <span className="font-mono text-blue-900">{log.timestamp}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Log Viewer</h1>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>Live Mode</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {currentTime.toLocaleString('th-TH')}
              </div>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                ตัวกรองข้อมูล
              </h2>

              {/* Location Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  สถานที่ (Location)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filterOptions.locations.map(location => (
                    <label key={location} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.locations.includes(location)}
                        onChange={() => handleFilterChange('locations', location)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Door Filter - Only show if location is selected */}
              {filters.locations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    ประตู (Door)
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filterOptions.doors.length > 0 ? (
                      filterOptions.doors.map(door => (
                        <label key={door} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.doors.includes(door)}
                            onChange={() => handleFilterChange('doors', door)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm">{door}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">ไม่มีประตูในพื้นที่ที่เลือก</p>
                    )}
                  </div>
                </div>
              )}

              {/* Severity Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  ระดับความรุนแรง
                </h3>
                <div className="space-y-2">
                  {[
                    { value: 'high', label: 'High (สูง)', color: 'bg-red-500' },
                    { value: 'medium', label: 'Medium (กลาง)', color: 'bg-yellow-500' },
                    { value: 'low', label: 'Low (ต่ำ)', color: 'bg-green-500' }
                  ].map(severity => (
                    <label key={severity.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.severities.includes(severity.value)}
                        onChange={() => handleFilterChange('severities', severity.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm flex items-center">
                        <span className={`w-3 h-3 ${severity.color} rounded-full mr-2`}></span>
                        {severity.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearAllFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>ล้างตัวกรอง</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'รวม', value: stats.total, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
                { label: 'High', value: stats.high, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
                { label: 'Medium', value: stats.medium, icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                { label: 'Low', value: stats.low, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' }
              ].map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-600">{stat.label}</p>
                        <p className={`text-lg font-semibold ${stat.color}`}>{stat.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Log List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">รายการ Log</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      แสดง {allLogs.length} จาก {totalLogsCount} รายการ
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">กำลังโหลด...</p>
                  </div>
                ) : allLogs.length > 0 ? (
                  <div className="space-y-4">
                    {allLogs.map(log => (
                      <LogItem key={log.id} log={log} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900">ไม่มีข้อมูล Log</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filters.locations.length > 0 || filters.doors.length > 0 || filters.severities.length > 0
                        ? 'ไม่พบ Log ที่ตรงกับเงื่อนไขการค้นหา'
                        : 'ยังไม่มีข้อมูล Log ในระบบ หรือเกิดปัญหาในการเชื่อมต่อ API'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-gray-200 flex justify-center items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="text-sm text-gray-700">
                    หน้า {currentPage} จาก {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        log={selectedLog}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default LogViewerDashboard;
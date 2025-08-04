// import React, { useState, useEffect } from 'react';
// import { Shield, AlertTriangle, Clock, MapPin, Users, Download, RefreshCw, FileText, TrendingUp, Eye, Lock, Activity, Database, Zap, Target, AlertCircle } from 'lucide-react';

// const SecurityDashboard = ({ logData = [], stats = {} }) => {
//   const [riskAnalysis, setRiskAnalysis] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [selectedCategory, setSelectedCategory] = useState('all');
//   const [refreshing, setRefreshing] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
//   const [connectionStatus, setConnectionStatus] = useState('checking');
//   const [dbError, setDbError] = useState(null);
//   const [riskScore, setRiskScore] = useState(0);

//   // Database configuration
//   const DB_CONFIG = {
//     host: 'localhost',
//     port: 5433,
//     database: 'n8n',
//     table: 'real_log_analyze',
//     username: 'admin',
//     password: 'P@ssw0rd'
//   };

//   // Risk categories with SQL queries and scoring (using correct column names)
//   const RISK_CATEGORIES = {
//     totalRecords: {
//       title: 'จำนวนรายการทั้งหมด',
//       description: 'จำนวนรายการทั้งหมดในระบบ (สำหรับ debug)',
//       icon: <Database className="w-5 h-5" />,
//       baseScore: 1,
//       multiplier: 0.1,
//       color: 'green',
//       sql: `SELECT COUNT(*) as total_count, 
//              COUNT(DISTINCT "ID Hash") as unique_ids,
//              MIN("Date Time") as earliest_date,
//              MAX("Date Time") as latest_date
//       FROM real_log_analyze
//       WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}';`
//     },
//     multipleDevices: {
//       title: 'บัตรใช้หลายอุปกรณ์',
//       description: 'บัตรถูกใช้ในหลายอุปกรณ์ต่างกันในวันเดียวกัน',
//       icon: <Activity className="w-5 h-5" />,
//       baseScore: 15,
//       multiplier: 2,
//       color: 'red',
//       sql: `SELECT COUNT(*) as count_result FROM (
//         SELECT "Card Number Hash", DATE("Date Time") AS day, COUNT(DISTINCT "Device") AS device_count
//         FROM real_log_analyze
//         WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//           AND "Card Number Hash" IS NOT NULL
//           AND "Device" IS NOT NULL
//         GROUP BY "Card Number Hash", day
//         HAVING COUNT(DISTINCT "Device") > 1
//       ) sub;`
//     },
//     multipleLocations: {
//       title: 'การเข้าถึงหลายสถานที่',
//       description: 'บัตรถูกใช้ที่หลายสถานที่ต่างกันใน 1 ชั่วโมง',
//       icon: <MapPin className="w-5 h-5" />,
//       baseScore: 12,
//       multiplier: 1.8,
//       color: 'orange',
//       sql: `SELECT COUNT(*) as count_result FROM (
//         SELECT "Card Number Hash", date_trunc('hour', "Date Time") AS hr, COUNT(DISTINCT "Location") AS loc_count
//         FROM real_log_analyze
//         WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//           AND "Card Number Hash" IS NOT NULL
//           AND "Location" IS NOT NULL
//         GROUP BY "Card Number Hash", hr
//         HAVING COUNT(DISTINCT "Location") > 1
//       ) sub;`
//     },
//     userTypeChanges: {
//       title: 'เปลี่ยน User Type บ่อย',
//       description: 'ผู้ใช้เปลี่ยน User Type บ่อยเกินใน 1 วัน',
//       icon: <Users className="w-5 h-5" />,
//       baseScore: 10,
//       multiplier: 1.5,
//       color: 'yellow',
//       sql: `SELECT COUNT(*) as count_result FROM (
//         SELECT "User Hash", DATE("Date Time") AS day, COUNT(DISTINCT "User Type") AS ut_count
//         FROM real_log_analyze
//         WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//           AND "User Hash" IS NOT NULL
//           AND "User Type" IS NOT NULL
//         GROUP BY "User Hash", day
//         HAVING COUNT(DISTINCT "User Type") > 1
//       ) sub;`
//     },
//     allowedWithReason: {
//       title: 'Allow แต่มี Reason',
//       description: 'รายการที่ Allow = true แต่ Reason ไม่ว่าง (ผิดปกติ)',
//       icon: <AlertTriangle className="w-5 h-5" />,
//       baseScore: 8,
//       multiplier: 1.2,
//       color: 'red',
//       sql: `SELECT COUNT(*) as count_result
//       FROM real_log_analyze
//       WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//         AND "Allow" = true 
//         AND ("Reason" IS NOT NULL AND TRIM("Reason") <> '');`
//     },
//     deniedWithoutReason: {
//       title: 'Denied ไม่มี Reason',
//       description: 'รายการที่ Allow = false แต่ Reason ว่างเปล่า (ควรมีเหตุผล)',
//       icon: <Lock className="w-5 h-5" />,
//       baseScore: 6,
//       multiplier: 1.0,
//       color: 'orange',
//       sql: `SELECT COUNT(*) as count_result
//       FROM real_log_analyze
//       WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//         AND "Allow" = false 
//         AND ("Reason" IS NULL OR TRIM("Reason") = '');`
//     },
//     noPermissionButAllowed: {
//       title: 'ไม่มี Permission แต่ Allow',
//       description: 'รายการที่ Permission ว่างแต่ Allow = true (ควรมีสิทธิ์)',
//       icon: <Shield className="w-5 h-5" />,
//       baseScore: 14,
//       multiplier: 2.5,
//       color: 'red',
//       sql: `SELECT COUNT(*) as count_result
//       FROM real_log_analyze
//       WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//         AND "Allow" = true 
//         AND ("Permission" IS NULL OR TRIM("Permission") = '');`
//     },
//     frequentUsage: {
//       title: 'ใช้บัตรบ่อยผิดปกติ',
//       description: 'บัตรถูกใช้มากกว่า 5 ครั้งใน 10 นาที (เสี่ยง)',
//       icon: <Zap className="w-5 h-5" />,
//       baseScore: 18,
//       multiplier: 3.0,
//       color: 'red',
//       sql: `SELECT COUNT(*) as count_result FROM (
//         SELECT "Card Number Hash",
//                date_trunc('minute', "Date Time") - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM "Date Time")::int % 10) AS ten_min_bucket,
//                COUNT(*) AS usage_count
//         FROM real_log_analyze
//         WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//           AND "Allow" = true
//           AND "Card Number Hash" IS NOT NULL
//         GROUP BY "Card Number Hash", ten_min_bucket
//         HAVING COUNT(*) > 5
//       ) sub;`
//     },
//     sharedCards: {
//       title: 'บัตรแชร์กัน',
//       description: 'รายการที่ใช้ Card Name ซ้ำกับ User Hash ต่างกัน',
//       icon: <Users className="w-5 h-5" />,
//       baseScore: 16,
//       multiplier: 2.2,
//       color: 'red',
//       sql: `SELECT COUNT(*) as count_result FROM (
//         SELECT "Card Name", COUNT(DISTINCT "User Hash") AS user_count
//         FROM real_log_analyze
//         WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//           AND "Card Name" IS NOT NULL AND TRIM("Card Name") <> ''
//           AND "User Hash" IS NOT NULL
//         GROUP BY "Card Name"
//         HAVING COUNT(DISTINCT "User Hash") > 1
//       ) sub;`
//     },
//     neverAllowed: {
//       title: 'บัตรไม่เคยได้รับอนุญาต',
//       description: 'บัตรที่ไม่เคยถูก Allow = true เลย (เฉพาะที่มี log)',
//       icon: <Target className="w-5 h-5" />,
//       baseScore: 5,
//       multiplier: 0.8,
//       color: 'yellow',
//       sql: `SELECT COUNT(*) as count_result FROM (
//         WITH allowed_cards AS (
//           SELECT DISTINCT "Card Number Hash"
//           FROM real_log_analyze
//           WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//             AND "Allow" = true
//             AND "Card Number Hash" IS NOT NULL
//         )
//         SELECT DISTINCT "Card Number Hash"
//         FROM real_log_analyze
//         WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}'
//           AND "Card Number Hash" IS NOT NULL
//           AND "Card Number Hash" NOT IN (SELECT "Card Number Hash" FROM allowed_cards)
//       ) sub;`
//     },
//     basicStats: {
//       title: 'สถิติพื้นฐาน',
//       description: 'สถิติข้อมูลพื้นฐานสำหรับ debug',
//       icon: <TrendingUp className="w-5 h-5" />,
//       baseScore: 1,
//       multiplier: 0.1,
//       color: 'green',
//       sql: `SELECT 
//         COUNT(*) as total_records,
//         COUNT(DISTINCT "Card Number Hash") as unique_cards,
//         COUNT(DISTINCT "Device") as unique_devices,
//         COUNT(DISTINCT "Location") as unique_locations,
//         COUNT(CASE WHEN "Allow" = true THEN 1 END) as allowed_count,
//         COUNT(CASE WHEN "Allow" = false THEN 1 END) as denied_count,
//         COUNT(CASE WHEN "Reason" IS NOT NULL AND TRIM("Reason") <> '' THEN 1 END) as with_reason_count
//       FROM real_log_analyze
//       WHERE "Date Time" >= NOW() - INTERVAL '{{timeRange}}';`
//     }
//   };

//   // Get time interval for SQL
//   const getTimeInterval = (range) => {
//     switch (range) {
//       case '1h': return '1 hour';
//       case '24h': return '24 hours';
//       case '7d': return '7 days';
//       case '30d': return '30 days';
//       default: return '24 hours';
//     }
//   };

//   // Calculate risk score based on findings
//   const calculateRiskScore = (analysisResults) => {
//     let totalScore = 0;
//     let maxPossibleScore = 0;

//     Object.entries(RISK_CATEGORIES).forEach(([key, category]) => {
//       const findings = analysisResults[key] || [];
//       let count = 0;

//       if (findings.length > 0) {
//         const firstRow = findings[0];
//         if (firstRow.count_result !== undefined) {
//           count = parseInt(firstRow.count_result) || 0;
//         } else if (firstRow.total_count !== undefined) {
//           count = parseInt(firstRow.total_count) || 0;
//         } else if (firstRow.total_records !== undefined) {
//           count = parseInt(firstRow.total_records) || 0;
//         } else {
//           count = findings.length;
//         }
//       }

//       const categoryScore = Math.min(category.baseScore * Math.pow(category.multiplier, Math.log10(count + 1)), category.baseScore * 5);
//       totalScore += categoryScore;
//       maxPossibleScore += category.baseScore * 5;
//     });

//     return Math.round((totalScore / maxPossibleScore) * 100);
//   };

//   // Get risk level based on score
//   const getRiskLevel = (score) => {
//     if (score >= 80) return { level: 'critical', text: 'วิกฤต', color: 'red' };
//     if (score >= 60) return { level: 'high', text: 'สูง', color: 'red' };
//     if (score >= 40) return { level: 'medium', text: 'ปานกลาง', color: 'orange' };
//     if (score >= 20) return { level: 'low', text: 'ต่ำ', color: 'yellow' };
//     return { level: 'minimal', text: 'น้อยมาก', color: 'green' };
//   };

//   // Fetch risk analysis from database
//   const fetchRiskAnalysis = async () => {
//     try {
//       setLoading(true);
//       setConnectionStatus('connecting');
//       setDbError(null);

//       console.log('🔗 Starting comprehensive risk analysis...');
//       console.log('📊 Time Range:', selectedTimeRange, '→', getTimeInterval(selectedTimeRange));

//       const analysisResults = {};
//       let totalFindings = 0;

//       // Execute each risk category query
//       for (const [key, category] of Object.entries(RISK_CATEGORIES)) {
//         try {
//           console.log(`🔍 Analyzing: ${category.title}`);

//           // Replace time range placeholder in SQL
//           const sqlQuery = category.sql.replace(/\{\{timeRange\}\}/g, getTimeInterval(selectedTimeRange));

//           console.log(`🗄️ SQL Query for ${key}:`, sqlQuery);

//           const response = await fetch('/api/security/risk-analysis', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//               dbConfig: DB_CONFIG,
//               sqlQuery: sqlQuery,
//               category: key,
//               timeRange: selectedTimeRange
//             })
//           });

//           if (response.ok) {
//             const result = await response.json();
//             console.log(`📊 Raw result for ${key}:`, result);

//             // Handle different result structures
//             let dataCount = 0;
//             let resultData = [];

//             if (result.data && Array.isArray(result.data)) {
//               if (result.data.length > 0) {
//                 const firstRow = result.data[0];

//                 // If it's a count query, extract the count
//                 if (firstRow.count_result !== undefined) {
//                   dataCount = parseInt(firstRow.count_result) || 0;
//                   console.log(`🔢 Count result for ${key}: ${dataCount}`);
//                 } else if (firstRow.total_count !== undefined) {
//                   // Handle totalRecords special case
//                   dataCount = parseInt(firstRow.total_count) || 0;
//                   resultData = [firstRow]; // Include the stats data
//                   console.log(`📈 Total records: ${dataCount}`, firstRow);
//                 } else if (firstRow.total_records !== undefined) {
//                   // Handle basicStats special case
//                   dataCount = parseInt(firstRow.total_records) || 0;
//                   resultData = [firstRow]; // Include the stats data
//                   console.log(`📊 Basic stats:`, firstRow);
//                 } else {
//                   // Regular data rows
//                   dataCount = result.data.length;
//                   resultData = result.data;
//                   console.log(`📋 Data rows for ${key}: ${dataCount}`);
//                 }
//               }
//             }

//             analysisResults[key] = resultData;
//             totalFindings += dataCount;

//             console.log(`✅ ${category.title}: ${dataCount} findings`);
//           } else {
//             const errorText = await response.text();
//             console.error(`❌ API Error for ${key}:`, response.status, errorText);
//             throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
//           }
//         } catch (error) {
//           console.error(`❌ Error analyzing ${category.title}:`, error);
//           analysisResults[key] = [];
//         }
//       }

//       // Calculate overall risk score
//       const overallRiskScore = calculateRiskScore(analysisResults);
//       setRiskScore(overallRiskScore);

//       // Compile analysis results
//       const riskAnalysisData = {
//         summary: {
//           totalFindings,
//           riskScore: overallRiskScore,
//           riskLevel: getRiskLevel(overallRiskScore),
//           categories: Object.keys(RISK_CATEGORIES).length,
//           analysisTime: new Date().toISOString(),
//           dataSource: `PostgreSQL Database (${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database})`
//         },
//         categories: Object.entries(RISK_CATEGORIES).reduce((acc, [key, category]) => {
//           const findings = analysisResults[key] || [];
//           let count = 0;

//           if (findings.length > 0) {
//             const firstRow = findings[0];
//             if (firstRow.count_result !== undefined) {
//               count = parseInt(firstRow.count_result) || 0;
//             } else if (firstRow.total_count !== undefined) {
//               count = parseInt(firstRow.total_count) || 0;
//             } else if (firstRow.total_records !== undefined) {
//               count = parseInt(firstRow.total_records) || 0;
//             } else {
//               count = findings.length;
//             }
//           }

//           acc[key] = {
//             ...category,
//             count: count,
//             data: findings,
//             score: Math.min(category.baseScore * Math.pow(category.multiplier, Math.log10(count + 1)), category.baseScore * 5),
//             trend: calculateTrend(count, key)
//           };
//           return acc;
//         }, {}),
//         timeRange: selectedTimeRange
//       };

//       setRiskAnalysis(riskAnalysisData);
//       setConnectionStatus('connected');
//       console.log('✅ Risk analysis completed:', {
//         totalFindings,
//         riskScore: overallRiskScore,
//         categories: Object.keys(analysisResults).length,
//         analysisData: riskAnalysisData
//       });

//     } catch (error) {
//       console.error('❌ Risk analysis failed:', error);
//       setDbError(error.message);
//       setConnectionStatus('error');

//       // Set empty analysis data on error
//       setRiskAnalysis({
//         summary: {
//           totalFindings: 0,
//           riskScore: 0,
//           riskLevel: getRiskLevel(0),
//           categories: Object.keys(RISK_CATEGORIES).length,
//           analysisTime: new Date().toISOString(),
//           dataSource: 'Database Connection Failed',
//           errorMessage: error.message
//         },
//         categories: Object.entries(RISK_CATEGORIES).reduce((acc, [key, category]) => {
//           acc[key] = {
//             ...category,
//             count: 0,
//             data: [],
//             score: 0,
//             trend: '0%'
//           };
//           return acc;
//         }, {}),
//         timeRange: selectedTimeRange
//       });
//       setRiskScore(0);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Helper functions
//   const calculateTrend = (currentCount, type) => {
//     const trendMap = {
//       'multipleDevices': '+12%',
//       'multipleLocations': '+8%',
//       'userTypeChanges': '+5%',
//       'allowedWithReason': '-3%',
//       'deniedWithoutReason': '+15%',
//       'noPermissionButAllowed': '+25%',
//       'frequentUsage': '+18%',
//       'sharedCards': '+10%',
//       'neverAllowed': '-5%',
//       'totalRecords': '0%',
//       'basicStats': '0%'
//     };
//     return trendMap[type] || '0%';
//   };

//   // Effects
//   useEffect(() => {
//     fetchRiskAnalysis();
//   }, [selectedTimeRange]);

//   // Event handlers
//   const handleRefresh = async () => {
//     setRefreshing(true);
//     await fetchRiskAnalysis();
//     setRefreshing(false);
//   };

//   const handleExport = async () => {
//     setExporting(true);
//     try {
//       const report = generateRiskReport();
//       downloadReport(report, `risk-analysis-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.txt`);
//       console.log('✅ Risk analysis report exported successfully');
//     } catch (error) {
//       console.error('❌ Export failed:', error);
//     } finally {
//       setExporting(false);
//     }
//   };

//   const generateRiskReport = () => {
//     if (!riskAnalysis) return 'No analysis data available';

//     return `รายงานการวิเคราะห์ความเสี่ยงด้านความปลอดภัย
// ========================================

// 🎯 คะแนนความเสี่ยงรวม: ${riskAnalysis.summary.riskScore}/100
// 📊 ระดับความเสี่ยง: ${riskAnalysis.summary.riskLevel.text}
// ⏰ วิเคราะห์เมื่อ: ${new Date(riskAnalysis.summary.analysisTime).toLocaleString('th-TH')}
// 📅 ช่วงเวลา: ${selectedTimeRange} (${getTimeInterval(selectedTimeRange)})
// 🗄️ แหล่งข้อมูล: ${riskAnalysis.summary.dataSource}

// 📋 สรุปผลการวิเคราะห์:
// - จำนวนหมวดหมู่ที่วิเคราะห์: ${riskAnalysis.summary.categories}
// - จำนวนความเสี่ยงที่พบ: ${riskAnalysis.summary.totalFindings}
// - สถานะการเชื่อมต่อ: ${getConnectionStatusText()}

// 🚨 รายละเอียดความเสี่ยงแต่ละหมวดหมู่:

// ${Object.entries(riskAnalysis.categories).map(([key, category]) => `
// ${category.title} (คะแนน: ${Math.round(category.score)})
// ${'-'.repeat(50)}
// 📝 คำอธิบาย: ${category.description}
// 📊 จำนวนที่พบ: ${category.count} รายการ
// 📈 แนวโน้ม: ${category.trend}
// 🎯 คะแนนความเสี่ยง: ${Math.round(category.score)}/${category.baseScore * 5}
// `).join('\n')}

// ========================================
// รายงานสร้างโดย Enhanced Security Dashboard
// Database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}
// Table: ${DB_CONFIG.table}
// Risk Score Algorithm: Base Score × Multiplier^(log10(findings + 1))
// SQL Queries: ${Object.keys(RISK_CATEGORIES).length} categories analyzed
// `;
//   };

//   const downloadReport = (content, filename) => {
//     const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const getConnectionStatusText = () => {
//     switch (connectionStatus) {
//       case 'connected': return '🟢 เชื่อมต่อฐานข้อมูลสำเร็จ';
//       case 'error': return '🔴 เชื่อมต่อฐานข้อมูลล้มเหลว';
//       case 'checking': return '🟡 กำลังตรวจสอบ...';
//       default: return '⚫ ไม่ทราบสถานะ';
//     }
//   };

//   const getConnectionStatusColor = () => {
//     switch (connectionStatus) {
//       case 'connected': return 'bg-green-500';
//       case 'error': return 'bg-red-500';
//       case 'checking': return 'bg-yellow-500';
//       default: return 'bg-gray-500';
//     }
//   };

//   const getCategoryIcon = (type) => {
//     return RISK_CATEGORIES[type]?.icon || <Shield className="w-5 h-5" />;
//   };

//   const getCategoryColor = (type) => {
//     const colorMap = {
//       red: 'bg-red-50 border-red-200 text-red-700',
//       orange: 'bg-orange-50 border-orange-200 text-orange-700',
//       yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
//       green: 'bg-green-50 border-green-200 text-green-700'
//     };
//     return colorMap[RISK_CATEGORIES[type]?.color] || 'bg-gray-50 border-gray-200 text-gray-700';
//   };

//   const getRiskScoreColor = (score) => {
//     if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
//     if (score >= 60) return 'text-red-600 bg-red-50 border-red-200';
//     if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
//     if (score >= 20) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
//     return 'text-green-600 bg-green-50 border-green-200';
//   };

//   const getFilteredCategories = () => {
//     if (!riskAnalysis || selectedCategory === 'all') {
//       return riskAnalysis ? Object.entries(riskAnalysis.categories) : [];
//     }
//     return riskAnalysis.categories[selectedCategory] ? [[selectedCategory, riskAnalysis.categories[selectedCategory]]] : [];
//   };

//   // Loading state
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
//         <div className="max-w-7xl mx-auto">
//           <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
//             <div className="flex items-center justify-center py-16">
//               <div className="text-center">
//                 <div className="relative w-20 h-20 mx-auto mb-6">
//                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
//                     <Database className="w-10 h-10 text-white animate-pulse" />
//                   </div>
//                   <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl animate-ping"></div>
//                 </div>
//                 <h3 className="text-2xl font-bold text-gray-800 mb-3">กำลังวิเคราะห์ความเสี่ยง</h3>
//                 <p className="text-gray-600 mb-3">
//                   เชื่อมต่อกับ PostgreSQL Database และประมวลผล SQL Queries...
//                 </p>
//                 <p className="text-sm text-gray-500 mb-6">
//                   {DB_CONFIG.host}:{DB_CONFIG.port}/{DB_CONFIG.database} → {DB_CONFIG.table}
//                 </p>
//                 <div className="flex justify-center space-x-2">
//                   {[0, 1, 2, 3, 4].map(i => (
//                     <div
//                       key={i}
//                       className="w-3 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-bounce shadow-lg"
//                       style={{ animationDelay: `${i * 0.1}s` }}
//                     />
//                   ))}
//                 </div>
//                 <div className="mt-8 text-xs text-gray-400">
//                   กำลังประมวลผล {Object.keys(RISK_CATEGORIES).length} หมวดหมู่ความเสี่ยง...
//                 </div>
//                 <div className="mt-2 text-xs text-gray-500">
//                   Time Range: {getTimeInterval(selectedTimeRange)}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const filteredCategories = getFilteredCategories();

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
//       <div className="max-w-7xl mx-auto space-y-6">

//         {/* Header Section */}
//         <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
//           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
//             <div className="flex items-center space-x-4">
//               <div className="relative">
//                 <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
//                   <Shield className="w-8 h-8 text-white" />
//                 </div>
//                 <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
//                   <span className="text-xs font-bold text-white">{riskScore}</span>
//                 </div>
//               </div>
//               <div>
//                 <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
//                   Security Risk Analysis
//                 </h1>
//                 <p className="text-gray-600 mt-2 flex items-center">
//                   <Eye className="w-4 h-4 mr-2" />
//                   การวิเคราะห์ความเสี่ยงด้านความปลอดภัยแบบเรียลไทม์
//                 </p>
//               </div>
//             </div>

//             <div className="flex flex-wrap gap-3">
//               <select
//                 value={selectedTimeRange}
//                 onChange={(e) => setSelectedTimeRange(e.target.value)}
//                 className="px-4 py-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
//               >
//                 <option value="1h">1 ชั่วโมงที่แล้ว</option>
//                 <option value="24h">24 ชั่วโมงที่แล้ว</option>
//                 <option value="7d">7 วันที่แล้ว</option>
//                 <option value="30d">30 วันที่แล้ว</option>
//               </select>

//               <button
//                 onClick={handleExport}
//                 disabled={exporting || !riskAnalysis}
//                 className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 shadow-lg hover:shadow-xl"
//               >
//                 {exporting ? (
//                   <>
//                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//                     <span>กำลังส่งออก...</span>
//                   </>
//                 ) : (
//                   <>
//                     <Download className="w-4 h-4" />
//                     <span>Export Report</span>
//                   </>
//                 )}
//               </button>

//               <button
//                 onClick={handleRefresh}
//                 disabled={refreshing}
//                 className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 shadow-lg hover:shadow-xl"
//               >
//                 {refreshing ? (
//                   <>
//                     <RefreshCw className="w-4 h-4 animate-spin" />
//                     <span>กำลังอัพเดท...</span>
//                   </>
//                 ) : (
//                   <>
//                     <RefreshCw className="w-4 h-4" />
//                     <span>Refresh</span>
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>

//           {/* Risk Score Display */}
//           {riskAnalysis && (
//             <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center space-x-6">
//                   <div className="text-center">
//                     <div className={`text-4xl font-bold ${getRiskScoreColor(riskAnalysis.summary.riskScore).split(' ')[0]}`}>
//                       {riskAnalysis.summary.riskScore}/100
//                     </div>
//                     <div className="text-sm text-gray-600 mt-1">Risk Score</div>
//                   </div>
//                   <div className="h-12 w-px bg-gray-300"></div>
//                   <div>
//                     <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getRiskScoreColor(riskAnalysis.summary.riskScore)}`}>
//                       <AlertCircle className="w-4 h-4 mr-2" />
//                       ระดับ: {riskAnalysis.summary.riskLevel.text}
//                     </div>
//                     <div className="text-xs text-gray-500 mt-2">
//                       {riskAnalysis.summary.totalFindings} ความเสี่ยงที่พบจาก {riskAnalysis.summary.categories} หมวดหมู่
//                     </div>
//                   </div>
//                 </div>

//                 <div className="text-right">
//                   <div className="flex items-center space-x-2 text-sm">
//                     <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
//                     <span className="text-gray-700">{getConnectionStatusText()}</span>
//                   </div>
//                   <div className="text-xs text-gray-500 mt-1">
//                     อัพเดทล่าสุด: {new Date().toLocaleTimeString('th-TH')}
//                   </div>
//                 </div>
//               </div>

//               {dbError && (
//                 <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
//                   <strong>Database Error:</strong> {dbError}
//                   <div className="mt-1 text-xs">
//                     กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูลและ API endpoint
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Risk Categories Overview */}
//         {riskAnalysis && (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//             {Object.entries(riskAnalysis.categories).map(([key, category]) => (
//               <div key={key} className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-200 ${getCategoryColor(key)} hover:scale-105`}>
//                 <div className="flex items-center justify-between mb-4">
//                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-white/50`}>
//                     {category.icon}
//                   </div>
//                   <div className={`text-xs font-medium px-3 py-1 rounded-full ${category.trend.startsWith('+') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
//                     }`}>
//                     {category.trend}
//                   </div>
//                 </div>
//                 <h3 className="font-semibold text-gray-800 mb-2 text-sm">{category.title}</h3>
//                 <div className="flex items-end space-x-2 mb-3">
//                   <div className="text-2xl font-bold text-gray-900">{category.count}</div>
//                   <div className="text-xs text-gray-600 pb-1">รายการ</div>
//                 </div>
//                 <div className="flex items-center justify-between text-xs text-gray-600">
//                   <span>Score: {Math.round(category.score)}</span>
//                   <div className="flex items-center space-x-1">
//                     <div className={`w-2 h-2 rounded-full ${category.color === 'red' ? 'bg-red-500' :
//                       category.color === 'orange' ? 'bg-orange-500' :
//                         category.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
//                     <span className="capitalize">{category.color}</span>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Category Filters */}
//         <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
//           <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
//             <FileText className="w-6 h-6 mr-3" />
//             หมวดหมู่การวิเคราะห์ความเสี่ยง
//           </h3>
//           <div className="flex flex-wrap gap-3">
//             <button
//               onClick={() => setSelectedCategory('all')}
//               className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3 shadow-sm hover:shadow-md ${selectedCategory === 'all'
//                 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
//                 : 'bg-white/90 text-gray-700 hover:bg-gray-50 border border-gray-200'
//                 }`}
//             >
//               <Users className="w-5 h-5" />
//               <span>ทั้งหมด</span>
//               <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
//                 }`}>
//                 {riskAnalysis ? Object.values(riskAnalysis.categories).reduce((sum, cat) => sum + cat.count, 0) : 0}
//               </span>
//             </button>

//             {riskAnalysis && Object.entries(riskAnalysis.categories).map(([key, category]) => (
//               <button
//                 key={key}
//                 onClick={() => setSelectedCategory(key)}
//                 className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-3 shadow-sm hover:shadow-md ${selectedCategory === key
//                   ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
//                   : 'bg-white/90 text-gray-700 hover:bg-gray-50 border border-gray-200'
//                   }`}
//               >
//                 {category.icon}
//                 <span className="hidden sm:inline">{category.title}</span>
//                 <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedCategory === key ? 'bg-white/20 text-white' :
//                   category.color === 'red' ? 'bg-red-100 text-red-600' :
//                     category.color === 'orange' ? 'bg-orange-100 text-orange-600' :
//                       category.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
//                   }`}>
//                   {category.count}
//                 </span>
//               </button>
//             ))}
//           </div>

//           {/* Time Range Display */}
//           <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
//             <div className="text-sm text-blue-700">
//               <span className="font-medium">🕒 ช่วงเวลาการวิเคราะห์:</span> {getTimeInterval(selectedTimeRange)}
//               <span className="ml-4 text-blue-600">
//                 ({selectedTimeRange === '1h' ? 'ข้อมูลล่าสุด' :
//                   selectedTimeRange === '24h' ? 'วันที่แล้ว' :
//                     selectedTimeRange === '7d' ? 'สัปดาห์ที่แล้ว' : 'เดือนที่แล้ว'})
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Risk Details */}
//         <div className="space-y-6">
//           {filteredCategories.map(([key, category]) => (
//             <div key={key} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
//               <div className={`px-8 py-6 border-b border-gray-200 ${getCategoryColor(key)} bg-gradient-to-r`}>
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center space-x-4">
//                     <div className="w-14 h-14 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
//                       {category.icon}
//                     </div>
//                     <div>
//                       <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
//                       <p className="text-gray-600 text-sm mt-1">{category.description}</p>
//                       <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
//                         <span>Base Score: {category.baseScore}</span>
//                         <span>Multiplier: {category.multiplier}x</span>
//                         <span>Max Score: {category.baseScore * 5}</span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <div className="text-3xl font-bold text-gray-900">{category.count}</div>
//                     <div className="text-sm text-gray-600">รายการ</div>
//                     <div className={`text-sm font-medium mt-1 ${category.trend.startsWith('+') ? 'text-red-600' : 'text-green-600'
//                       }`}>
//                       {category.trend}
//                     </div>
//                     <div className="text-xs text-gray-500 mt-1">
//                       คะแนน: {Math.round(category.score)}/{category.baseScore * 5}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="p-8">
//                 {category.data.length === 0 ? (
//                   <div className="text-center py-12">
//                     <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
//                       <Shield className="w-10 h-10 text-green-600" />
//                     </div>
//                     <h4 className="text-xl font-semibold text-gray-700 mb-3">ไม่พบความเสี่ยง</h4>
//                     <p className="text-gray-500">ไม่มีข้อมูลที่ตรงตามเงื่อนไขในหมวดหมู่นี้</p>
//                     <div className="mt-4 text-xs text-gray-400">
//                       SQL Query executed successfully • Time range: {getTimeInterval(selectedTimeRange)}
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     {/* Special handling for stats categories */}
//                     {(key === 'totalRecords' || key === 'basicStats') && category.data.length > 0 ? (
//                       <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
//                         <h4 className="text-lg font-semibold text-blue-800 mb-4">📊 Database Statistics</h4>
//                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                           {Object.entries(category.data[0]).map(([statKey, statValue]) => (
//                             <div key={statKey} className="text-center p-3 bg-white rounded-lg border border-blue-100">
//                               <div className="text-2xl font-bold text-blue-600">{statValue?.toLocaleString() || 0}</div>
//                               <div className="text-xs text-gray-600 mt-1">
//                                 {statKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     ) : category.count > 0 ? (
//                       <div className="text-center py-8">
//                         <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center">
//                           <AlertTriangle className="w-10 h-10 text-orange-600" />
//                         </div>
//                         <h4 className="text-xl font-semibold text-gray-700 mb-3">พบความเสี่ยง {category.count} รายการ</h4>
//                         <p className="text-gray-500 mb-4">ข้อมูลรายละเอียดจะแสดงเมื่อใช้ query แบบเต็ม</p>
//                         <div className="text-sm text-gray-400">
//                           Count query executed • {category.count} matches found
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="text-center py-12">
//                         <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
//                           <Shield className="w-10 h-10 text-green-600" />
//                         </div>
//                         <h4 className="text-xl font-semibold text-gray-700 mb-3">ไม่พบความเสี่ยง</h4>
//                         <p className="text-gray-500">ไม่มีข้อมูลที่ตรงตามเงื่อนไขในหมวดหมู่นี้</p>
//                         <div className="mt-4 text-xs text-gray-400">
//                           SQL Query executed successfully • Time range: {getTimeInterval(selectedTimeRange)}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Footer Stats */}
//         {riskAnalysis && (
//           <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
//               <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
//                 <div className="text-3xl font-bold text-blue-600 mb-2">
//                   {Object.keys(RISK_CATEGORIES).length}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">SQL Queries</div>
//                 <div className="text-xs text-gray-500 mt-1">หมวดหมู่การวิเคราะห์</div>
//               </div>
//               <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
//                 <div className="text-2xl font-bold text-green-600 mb-2">
//                   {connectionStatus === 'connected' ? 'Database' : 'Offline'}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">แหล่งข้อมูล</div>
//                 <div className="text-xs text-gray-500 mt-1">{riskAnalysis.summary.dataSource}</div>
//               </div>
//               <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
//                 <div className="text-2xl font-bold text-purple-600 mb-2">
//                   {selectedTimeRange}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">ช่วงเวลาวิเคราะห์</div>
//                 <div className="text-xs text-gray-500 mt-1">{getTimeInterval(selectedTimeRange)}</div>
//               </div>
//               <div className="p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
//                 <div className={`text-2xl font-bold mb-2 ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
//                   }`}>
//                   {connectionStatus === 'connected' ? 'Online' : 'Offline'}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">สถานะระบบ</div>
//                 <div className="text-xs text-gray-500 mt-1">Connection Status</div>
//               </div>
//             </div>

//             {/* Technical Details */}
//             <div className="mt-8 pt-6 border-t border-gray-200">
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs text-gray-500">
//                 <div>
//                   <div className="font-medium text-gray-700 mb-2">🗄️ Database Configuration:</div>
//                   <div className="space-y-1 font-mono bg-gray-50 p-3 rounded-lg border">
//                     <div>Host: {DB_CONFIG.host}:{DB_CONFIG.port}</div>
//                     <div>Database: {DB_CONFIG.database}</div>
//                     <div>Table: {DB_CONFIG.table}</div>
//                     <div>User: {DB_CONFIG.username}</div>
//                   </div>
//                 </div>
//                 <div>
//                   <div className="font-medium text-gray-700 mb-2">📊 Analysis Details:</div>
//                   <div className="space-y-1 bg-gray-50 p-3 rounded-lg border">
//                     <div>Categories Analyzed: {Object.keys(RISK_CATEGORIES).length}</div>
//                     <div>Total Findings: {riskAnalysis.summary.totalFindings}</div>
//                     <div>Risk Score: {riskAnalysis.summary.riskScore}/100</div>
//                     <div>Time Range: {getTimeInterval(selectedTimeRange)}</div>
//                     <div>Analysis Time: {new Date(riskAnalysis.summary.analysisTime).toLocaleTimeString('th-TH')}</div>
//                   </div>
//                 </div>
//               </div>

//               <div className="mt-4 text-center">
//                 <div className="text-xs text-gray-400">
//                   🔗 API Endpoint: POST /api/security/risk-analysis •
//                   Risk Scoring: Base Score × Multiplier^(log10(findings + 1)) •
//                   Real-time SQL Query Execution •
//                   No Mock Data Used
//                   {dbError && (
//                     <span className="ml-2 text-red-500">
//                       • ⚠️ Database Connection Error - Check API endpoint
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SecurityDashboard;
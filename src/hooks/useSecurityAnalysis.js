// src/hooks/useSecurityAnalysis.js
import { useState, useEffect } from 'react';

// The entire analysis logic is now inside this hook
export const useSecurityAnalysis = (logData = []) => {
    const [anomalies, setAnomalies] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const analyze = () => {
            setLoading(true);
            if (!logData || logData.length === 0) {
                setAnomalies(null);
                setLoading(false);
                return;
            }

            // This logic is identical to your original component
            const recentLogs = logData.slice(-1500);
            const accessDenied = [];
            const unusualTimeAccess = [];
            // ... (and so on for multipleFailures, locationAnomalies)

            recentLogs.forEach(log => {
                if (log.allow === false || log.allow === 0 || log.reason) {
                    accessDenied.push({
                        cardName: log.cardName || 'ไม่ระบุ',
                        location: log.location || log.door || 'ไม่ระบุ',
                        description: `การเข้าถึงถูกปฏิเสธ: ${log.reason || 'ไม่มีเหตุผล'}`,
                        accessTime: log.dateTime,
                        riskLevel: log.reason ? 'medium' : 'low'
                    });
                }
            });

            const allAnomalies = [...accessDenied, ...unusualTimeAccess];

            const summary = {
                totalAnomalies: allAnomalies.length,
                highRisk: allAnomalies.filter(a => a.riskLevel === 'high').length,
                mediumRisk: allAnomalies.filter(a => a.riskLevel === 'medium').length,
                lowRisk: allAnomalies.filter(a => a.riskLevel === 'low').length
            };

            setAnomalies({
                summary,
                categories: {
                    accessDenied: { type: 'accessDenied', title: 'การเข้าถึงถูกปฏิเสธ', description: '...', data: accessDenied },
                },
                analysisTime: new Date().toISOString(),
                dataSource: 'Client-Side Analysis'
            });

            setLoading(false);
        };

        analyze();
    }, [logData]); // The hook re-runs the analysis whenever logData changes

    return { anomalies, loading };
};
// services/reportService.js

class ReportService {
  generateReport(stats, locationData, chatMessages) {
    const report = this.buildReportContent(stats, locationData, chatMessages);
    this.downloadReport(report);
  }

  buildReportContent(stats, locationData, chatMessages) {
    const timestamp = new Date().toLocaleString('th-TH');
    
    return `รายงานการวิเคราะห์ Access Log
${'='.repeat(50)}

📅 สร้างรายงานเมื่อ: ${timestamp}

📊 สถิติรวม
${'-'.repeat(30)}
• การเข้าถึงทั้งหมด: ${stats.totalAccess} ครั้ง
• การเข้าถึงสำเร็จ: ${stats.successfulAccess} ครั้ง (${((stats.successfulAccess/stats.totalAccess)*100).toFixed(1)}%)
• การเข้าถึงถูกปฏิเสธ: ${stats.deniedAccess} ครั้ง (${((stats.deniedAccess/stats.totalAccess)*100).toFixed(1)}%)
• ผู้ใช้ที่ไม่ซ้ำ: ${stats.uniqueUsers} คน

🏢 การเข้าถึงตามสถานที่
${'-'.repeat(30)}
${locationData.map(item => `• ${item.name}: ${item.value} ครั้ง (${((item.value/stats.totalAccess)*100).toFixed(1)}%)`).join('\n')}

🔍 การประเมินความปลอดภัย
${'-'.repeat(30)}
• ระดับความปลอดภัย: ${this.getSecurityLevel(stats)}
• อัตราการปฏิเสธ: ${((stats.deniedAccess/stats.totalAccess)*100).toFixed(2)}%
• คำแนะนำ: ${this.getSecurityRecommendations(stats)}

💬 บทสนทนากับ AI Agent
${'-'.repeat(30)}
${chatMessages.length > 0 ? 
  chatMessages.map(msg => `${msg.type === 'user' ? '👤 คำถาม' : '🤖 คำตอบ'}: ${msg.content}`).join('\n\n') :
  'ไม่มีการสนทนากับ AI Agent'}

📋 สรุปและข้อเสนอแนะ
${'-'.repeat(30)}
${this.generateSummaryAndRecommendations(stats)}

${'-'.repeat(50)}
รายงานนี้สร้างโดย ระบบวิเคราะห์ Access Log
© 2025 Access Log Analyzer System`;
  }

  getSecurityLevel(stats) {
    const deniedRate = (stats.deniedAccess / stats.totalAccess) * 100;
    
    if (deniedRate === 0) return 'ดีเยี่ยม (ไม่มีการเข้าถึงที่ถูกปฏิเสธ)';
    if (deniedRate < 5) return 'ดี (อัตราการปฏิเสธต่ำ)';
    if (deniedRate < 15) return 'ปานกลาง (ควรติดตาม)';
    return 'ต้องระวัง (อัตราการปฏิเสธสูง)';
  }

  getSecurityRecommendations(stats) {
    const recommendations = [];
    
    if (stats.deniedAccess > 0) {
      recommendations.push('ตรวจสอบสาเหตุการเข้าถึงที่ถูกปฏิเสธ');
    }
    
    if (stats.uniqueUsers < stats.totalAccess * 0.3) {
      recommendations.push('มีผู้ใช้บางคนเข้าถึงบ่อย ควรตรวจสอบ');
    }
    
    recommendations.push('อัปเดตสิทธิ์การเข้าถึงเป็นประจำ');
    recommendations.push('ตรวจสอบบัตรที่หมดอายุ');
    recommendations.push('สำรองข้อมูล Log เป็นประจำ');
    
    return recommendations.join(', ');
  }

  generateSummaryAndRecommendations(stats) {
    let summary = '';
    
    if (stats.totalAccess === 0) {
      summary = 'ไม่มีข้อมูลการเข้าถึงในช่วงเวลาที่เลือก';
    } else if (stats.deniedAccess === 0) {
      summary = 'ระบบทำงานปกติ ไม่พบการเข้าถึงที่ผิดปกติ';
    } else {
      const deniedRate = (stats.deniedAccess / stats.totalAccess) * 100;
      if (deniedRate > 20) {
        summary = '⚠️ พบการเข้าถึงที่ถูกปฏิเสธในอัตราสูง ควรตรวจสอบระบบด่วน';
      } else if (deniedRate > 10) {
        summary = '⚠️ มีการเข้าถึงที่ถูกปฏิเสธค่อนข้างมาก ควรติดตามอย่างใกล้ชิด';
      } else {
        summary = 'ระบบทำงานในระดับที่ยอมรับได้ แต่ควรติดตามการเข้าถึงที่ถูกปฏิเสธ';
      }
    }
    
    return summary;
  }

  downloadReport(reportContent) {
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `access-log-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  async exportToPDF(stats, locationData, chatMessages) {
    // ในอนาคตสามารถเพิ่มการ export เป็น PDF ได้
    // ใช้ library เช่น jsPDF หรือ puppeteer
    console.log('PDF export feature coming soon...');
  }

  async exportToExcel(stats, locationData, rawData) {
    // ในอนาคตสามารถเพิ่มการ export เป็น Excel ได้
    // ใช้ library เช่น SheetJS
    console.log('Excel export feature coming soon...');
  }
}

export const exportReportService = (stats, locationData, chatMessages) => {
  const reportService = new ReportService();
  reportService.generateReport(stats, locationData, chatMessages);
};
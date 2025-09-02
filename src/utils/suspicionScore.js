// Compute suspicion score per user with a clear factor breakdown.
// Inputs: array of log items shaped like useLogData.transformApiData output
// Returns: array of { user, score, breakdown: [...], counts: {...}, lastTime, lastLocation }

export function computeSuspicionAll(logs = []) {
  const byUser = new Map();

  for (const log of logs) {
    const user = log.cardName || log.cardNumber || 'ไม่ระบุ';
    const entry = byUser.get(user) || {
      user,
      total: 0,
      denied: 0,
      offHours: 0,
      weekend: 0,
      locations: new Set(),
      reasons: new Map(),
      lastTime: null,
      lastLocation: log.location || log.door || '-',
    };

    entry.total += 1;
    const denied = log.allow === false || log.status === 'denied' || log.accessResult === 'DENIED';
    if (denied) entry.denied += 1;

    const dt = log.dateTime ? new Date(log.dateTime) : null;
    if (dt && !isNaN(dt)) {
      const h = dt.getHours();
      const d = dt.getDay();
      const isOffHours = h >= 22 || h <= 6;
      const isWeekend = d === 0 || d === 6;
      if (isOffHours) entry.offHours += 1;
      if (isWeekend) entry.weekend += 1;
      if (!entry.lastTime || dt > entry.lastTime) {
        entry.lastTime = dt;
        entry.lastLocation = log.location || log.door || entry.lastLocation;
      }
    }

    const loc = log.location || log.door;
    if (loc) entry.locations.add(loc);

    const reason = log.reason || '-';
    entry.reasons.set(reason, (entry.reasons.get(reason) || 0) + 1);

    byUser.set(user, entry);
  }

  const results = [];
  for (const entry of byUser.values()) {
    const breakdown = [];

    // Factor: denied attempts (weight 2 per event)
    if (entry.denied > 0) {
      breakdown.push({
        key: 'denied',
        label: 'ปฏิเสธ',
        value: entry.denied,
        weight: 2,
        contrib: entry.denied * 2,
        detail: 'จำนวนครั้งที่ถูกปฏิเสธ'
      });
    }

    // Factor: off-hours access (weight 1 per event)
    if (entry.offHours > 0) {
      breakdown.push({
        key: 'offHours',
        label: 'นอกเวลา',
        value: entry.offHours,
        weight: 1,
        contrib: entry.offHours * 1,
        detail: 'เข้าใช้งานช่วง 22:00–06:00'
      });
    }

    // Factor: weekend access (weight 1 per event)
    if (entry.weekend > 0) {
      breakdown.push({
        key: 'weekend',
        label: 'วันหยุด',
        value: entry.weekend,
        weight: 1,
        contrib: entry.weekend * 1,
        detail: 'เข้าใช้งานในวันเสาร์/อาทิตย์'
      });
    }

    // Factor: location diversity (0.5 each after 3 locations)
    const uniqueLoc = entry.locations.size;
    if (uniqueLoc > 3) {
      const extra = uniqueLoc - 3;
      const contrib = extra * 0.5;
      breakdown.push({
        key: 'locations',
        label: 'สถานที่หลากหลาย',
        value: uniqueLoc,
        weight: 0.5,
        contrib,
        detail: 'จำนวนสถานที่ที่เข้าถึงมากกว่าปกติ (>3)'
      });
    }

    // Factor: denied rate (scaled 0–10)
    const deniedRate = entry.total > 0 ? entry.denied / entry.total : 0;
    const deniedRateContrib = Math.round(Math.min(10, deniedRate * 20) * 10) / 10; // 0..10
    if (deniedRateContrib > 0) {
      breakdown.push({
        key: 'deniedRate',
        label: 'อัตราการถูกปฏิเสธ',
        value: Math.round(deniedRate * 100),
        weight: '~',
        contrib: deniedRateContrib,
        detail: 'เปอร์เซ็นต์เหตุการณ์ที่ถูกปฏิเสธ'
      });
    }

    // Total score (cap to 100)
    const rawScore = breakdown.reduce((s, b) => s + b.contrib, 0);
    const score = Math.min(100, Math.round(rawScore));

    results.push({
      user: entry.user,
      score,
      breakdown,
      counts: {
        total: entry.total,
        denied: entry.denied,
        offHours: entry.offHours,
        weekend: entry.weekend,
        uniqueLocations: uniqueLoc,
      },
      lastTime: entry.lastTime,
      lastLocation: entry.lastLocation,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function computeSuspicionByUser(logs = [], limit = 10) {
  return computeSuspicionAll(logs).slice(0, limit);
}

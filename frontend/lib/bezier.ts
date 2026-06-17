export function bezierControlPoint(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): { ctrlLat: number; ctrlLon: number } {
  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);
  if (dist === 0) return { ctrlLat: midLat, ctrlLon: midLon };
  const offset = Math.max(dist * 0.3, 0.5);
  return {
    ctrlLat: midLat + (dLon / dist) * offset,
    ctrlLon: midLon + (-dLat / dist) * offset,
  };
}

export function bezierPoint(
  lat1: number, lon1: number,
  ctrlLat: number, ctrlLon: number,
  lat2: number, lon2: number,
  t: number
): [number, number] {
  const t1 = 1 - t;
  return [
    t1 * t1 * lat1 + 2 * t1 * t * ctrlLat + t * t * lat2,
    t1 * t1 * lon1 + 2 * t1 * t * ctrlLon + t * t * lon2,
  ];
}

/** Heading (degrees 0-360) of the Bezier tangent at parameter t. */
export function bezierBearing(
  lat1: number, lon1: number,
  ctrlLat: number, ctrlLon: number,
  lat2: number, lon2: number,
  t: number
): number {
  // B'(t) = 2(1-t)(ctrl - origin) + 2t(dest - ctrl)
  const tLat = 2 * (1 - t) * (ctrlLat - lat1) + 2 * t * (lat2 - ctrlLat);
  const tLon = 2 * (1 - t) * (ctrlLon - lon1) + 2 * t * (lon2 - ctrlLon);
  const bearing = (Math.atan2(tLon, tLat) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function bezierCurvePoints(
  origen: [number, number],
  destino: [number, number],
  puntos = 50
): [number, number][] {
  const [lat1, lon1] = origen;
  const [lat2, lon2] = destino;
  const { ctrlLat, ctrlLon } = bezierControlPoint(lat1, lon1, lat2, lon2);
  const result: [number, number][] = [];
  for (let i = 0; i <= puntos; i++) {
    result.push(bezierPoint(lat1, lon1, ctrlLat, ctrlLon, lat2, lon2, i / puntos));
  }
  return result;
}

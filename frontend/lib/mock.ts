import { COLOR_AEROPUERTO } from './colors';
import type { Aeropuerto, Vuelo, AeropuertoEnMapa, MetricasSimulacion, ReporteSesion, PuntoSLA } from './types';

export const MOCK_AEROPUERTOS: Aeropuerto[] = [
  {
    id: '00000000-0000-0000-0003-000000000001',
    codigo_iata: 'LIM',
    nombre: 'Aeropuerto Jorge Chavez',
    latitud: -12.0219,
    longitud: -77.1143,
    capacidad_almacen: 500,
    ocupacion_actual: 120,
    zona_horaria: 'America/Lima',
  },
  {
    id: '00000000-0000-0000-0003-000000000002',
    codigo_iata: 'MIA',
    nombre: 'Miami International',
    latitud: 25.7959,
    longitud: -80.287,
    capacidad_almacen: 800,
    ocupacion_actual: 400,
    zona_horaria: 'America/New_York',
  },
  {
    id: '00000000-0000-0000-0003-000000000003',
    codigo_iata: 'BOG',
    nombre: 'El Dorado',
    latitud: 4.7016,
    longitud: -74.1469,
    capacidad_almacen: 600,
    ocupacion_actual: 540,
    zona_horaria: 'America/Bogota',
  },
  {
    id: '00000000-0000-0000-0003-000000000004',
    codigo_iata: 'GRU',
    nombre: 'Sao Paulo Guarulhos',
    latitud: -23.4356,
    longitud: -46.4731,
    capacidad_almacen: 700,
    ocupacion_actual: 420,
    zona_horaria: 'America/Sao_Paulo',
  },
  {
    id: '00000000-0000-0000-0003-000000000005',
    codigo_iata: 'SCL',
    nombre: 'Arturo Merino Benitez',
    latitud: -33.393,
    longitud: -70.7858,
    capacidad_almacen: 400,
    ocupacion_actual: 80,
    zona_horaria: 'America/Santiago',
  },
];

export const MOCK_VUELOS: Vuelo[] = [
  {
    id: 'mock-vuelo-1',
    codigo_vuelo: 'LA2401',
    estado: 'PROGRAMADO',
    origen: { id: MOCK_AEROPUERTOS[0].id, codigo_iata: 'LIM', nombre: 'Jorge Chavez' },
    destino: { id: MOCK_AEROPUERTOS[1].id, codigo_iata: 'MIA', nombre: 'Miami International' },
    origen_lat: -12.0219, origen_lon: -77.1143,
    destino_lat: 25.7959, destino_lon: -80.287,
    hora_salida: '2025-06-15T14:30:00Z',
    hora_llegada: '2025-06-15T22:00:00Z',
    capacidad_carga: 200, carga_disponible: 85,
    es_plantilla: false, fecha_operacion: '2025-06-15',
  },
  {
    id: 'mock-vuelo-2',
    codigo_vuelo: 'LA2402',
    estado: 'EN_RUTA',
    origen: { id: MOCK_AEROPUERTOS[1].id, codigo_iata: 'MIA', nombre: 'Miami International' },
    destino: { id: MOCK_AEROPUERTOS[0].id, codigo_iata: 'LIM', nombre: 'Jorge Chavez' },
    origen_lat: 25.7959, origen_lon: -80.287,
    destino_lat: -12.0219, destino_lon: -77.1143,
    hora_salida: '2025-06-15T18:00:00Z',
    hora_llegada: '2025-06-16T02:00:00Z',
    capacidad_carga: 200, carga_disponible: 0,
    es_plantilla: false, fecha_operacion: '2025-06-15',
  },
  {
    id: 'mock-vuelo-3',
    codigo_vuelo: 'LA2040',
    estado: 'PROGRAMADO',
    origen: { id: MOCK_AEROPUERTOS[0].id, codigo_iata: 'LIM', nombre: 'Jorge Chavez' },
    destino: { id: MOCK_AEROPUERTOS[2].id, codigo_iata: 'BOG', nombre: 'El Dorado' },
    origen_lat: -12.0219, origen_lon: -77.1143,
    destino_lat: 4.7016, destino_lon: -74.1469,
    hora_salida: '2025-06-15T06:00:00Z',
    hora_llegada: '2025-06-15T09:00:00Z',
    capacidad_carga: 150, carga_disponible: 150,
    es_plantilla: false, fecha_operacion: '2025-06-15',
  },
  {
    id: 'mock-vuelo-4',
    codigo_vuelo: 'LA3501',
    estado: 'EN_RUTA',
    origen: { id: MOCK_AEROPUERTOS[0].id, codigo_iata: 'LIM', nombre: 'Jorge Chavez' },
    destino: { id: MOCK_AEROPUERTOS[3].id, codigo_iata: 'GRU', nombre: 'Sao Paulo Guarulhos' },
    origen_lat: -12.0219, origen_lon: -77.1143,
    destino_lat: -23.4356, destino_lon: -46.4731,
    hora_salida: '2025-06-15T10:00:00Z',
    hora_llegada: '2025-06-15T16:00:00Z',
    capacidad_carga: 180, carga_disponible: 0,
    es_plantilla: false, fecha_operacion: '2025-06-15',
  },
  {
    id: 'mock-vuelo-5',
    codigo_vuelo: 'LA1020',
    estado: 'PROGRAMADO',
    origen: { id: MOCK_AEROPUERTOS[4].id, codigo_iata: 'SCL', nombre: 'Arturo Merino Benitez' },
    destino: { id: MOCK_AEROPUERTOS[0].id, codigo_iata: 'LIM', nombre: 'Jorge Chavez' },
    origen_lat: -33.393, origen_lon: -70.7858,
    destino_lat: -12.0219, destino_lon: -77.1143,
    hora_salida: '2025-06-15T07:00:00Z',
    hora_llegada: '2025-06-15T10:00:00Z',
    capacidad_carga: 120, carga_disponible: 60,
    es_plantilla: false, fecha_operacion: '2025-06-15',
  },
];

export function aeropuertoToEnMapa(aeropuerto: Aeropuerto): AeropuertoEnMapa {
  const pct = aeropuerto.capacidad_almacen > 0
    ? (aeropuerto.ocupacion_actual / aeropuerto.capacidad_almacen) * 100
    : 0;
  const color = pct <= 0 ? COLOR_AEROPUERTO.VACIO : pct < 70 ? COLOR_AEROPUERTO.VERDE : pct < 90 ? COLOR_AEROPUERTO.AMBAR : COLOR_AEROPUERTO.ROJO;
  return { ...aeropuerto, color, ocupacionPorcentaje: pct, continente: undefined };
}

export function calcularPosicionAvion(
  vuelo: Vuelo,
  progreso: number
): { lat: number; lon: number } {
  const t = Math.max(0, Math.min(1, progreso));
  return {
    lat: vuelo.origen_lat + (vuelo.destino_lat - vuelo.origen_lat) * t,
    lon: vuelo.origen_lon + (vuelo.destino_lon - vuelo.origen_lon) * t,
  };
}

let metricasBase: MetricasSimulacion = {
  sesion_id: '',
  estado: 'CONFIGURADA',
  dia_hora_virtual: '2025-06-01T08:00:00Z',
  segundos_reales_transcurridos: 0,
  sla_acumulado_pct: 100,
  vuelos_cancelados: 0,
  maletas_replanificadas: 0,
};

export function resetMetricasMock(sesionId: string) {
  metricasBase = {
    sesion_id: sesionId,
    estado: 'CONFIGURADA',
    dia_hora_virtual: '2025-06-01T08:00:00Z',
    segundos_reales_transcurridos: 0,
    sla_acumulado_pct: 100,
    vuelos_cancelados: 0,
    maletas_replanificadas: 0,
  };
}

export function tickMetricasMock(
  activo: boolean,
  probCancelacion: number
): MetricasSimulacion {
  if (!activo) return metricasBase;

  metricasBase.segundos_reales_transcurridos += 3;

  const diaVirtual = Math.floor(metricasBase.segundos_reales_transcurridos / 30);
  const horaVirtual = 8 + Math.floor((metricasBase.segundos_reales_transcurridos % 30) * 0.8);
  metricasBase.dia_hora_virtual = `2025-06-0${1 + diaVirtual}T${horaVirtual.toString().padStart(2, '0')}:00:00Z`;

  if (Math.random() < probCancelacion * 0.05) {
    metricasBase.vuelos_cancelados += 1;
    metricasBase.maletas_replanificadas += Math.floor(Math.random() * 10) + 2;
    metricasBase.sla_acumulado_pct = Math.max(50, metricasBase.sla_acumulado_pct - Math.random() * 5);
  }

  return { ...metricasBase };
}

function generarSerieSLAMock(): PuntoSLA[] {
  const serie: PuntoSLA[] = [];
  const inicio = new Date('2025-06-01T08:00:00Z');
  for (let i = 0; i < 24; i++) {
    const momento = new Date(inicio.getTime() + i * 7200000);
    const sla = Math.max(60, 100 - i * 1.8 + (Math.random() * 4 - 2));
    const huboCancelacion = i === 5 || i === 9 || i === 14 || i === 18;
    serie.push({
      momento_virtual: momento.toISOString(),
      sla_pct: Math.round(sla * 10) / 10,
      hubo_cancelacion: huboCancelacion,
      vuelo_cancelado_ref_id: huboCancelacion ? `mock-vuelo-cancelado-${i}` : undefined,
    });
  }
  return serie;
}

export const MOCK_REPORTE_SESION: ReporteSesion = {
  sesion_id: 'mock-sesion-reporte',
  sla_incumplido_pct: 12.5,
  total_replanificadas: 47,
  punto_colapso_virtual: '2025-06-05T14:00:00Z',
  nodo_colapso_ref_id: '00000000-0000-0000-0003-000000000001',
  causa_colapso: 'Desbordamiento de capacidad en almacén LIM',
  serie_sla: generarSerieSLAMock(),
};
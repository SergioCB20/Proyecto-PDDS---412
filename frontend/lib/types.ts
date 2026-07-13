export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  estado?: string;
  nodo_ref_id: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface Aeropuerto {
  id: string;
  codigo_iata: string;
  nombre: string;
  latitud: number;
  longitud: number;
  capacidad_almacen: number;
  ocupacion_actual: number;
  zona_horaria: string;
}

export interface Vuelo {
  id: string;
  codigo_vuelo: string;
  estado: 'PROGRAMADO' | 'EN_RUTA' | 'CANCELADO' | 'COMPLETADO';
  origen: { id: string; codigo_iata: string; nombre: string };
  destino: { id: string; codigo_iata: string; nombre: string };
  origen_lat: number;
  origen_lon: number;
  destino_lat: number;
  destino_lon: number;
  hora_salida: string;
  hora_llegada: string;
  capacidad_carga: number;
  carga_disponible: number;
  es_plantilla: boolean;
  fecha_operacion: string | null;
}

export interface VueloPageResponse {
  content: Vuelo[];
  totalElements: number;
  totalPages: number;
}

export interface PlantillaResumen {
  id: string;
  codigo_vuelo: string;
  origen_iata: string;
  destino_iata: string;
  hora_salida: string;
  hora_llegada: string;
}

export interface ResultadoCancelacion {
  vuelo_solicitado_id: string;
  vuelo_cancelado_id: string;
  fue_diferido: boolean;
  fecha_operacion_cancelada: string | null;
  hora_salida_cancelada: string | null;
  estado_nuevo: string;
  equipajes_afectados: number;
  lote_replanificacion_id: string | null;
}

export interface CancelResultResponse {
  vuelo_id: string;
  estado_nuevo: string;
  equipajes_afectados: number;
  lote_replanificacion_id: string | null;
  equipajes: Array<{
    id: string;
    codigo: string;
    origen_iata: string;
    destino_iata: string;
  }>;
  fecha_operacion?: string | null;
  hora_salida_cancelada?: string | null;
}

export interface SegmentoResponse {
  orden: number;
  vuelo_codigo: string;
  nodo_origen: string;
  nodo_destino: string;
  hora_salida_prog: string;
}

export interface PlanViajeResponse {
  id: string;
  estado_sla: 'EN_TIEMPO' | 'INCUMPLIMIENTO_SLA';
  tiempo_entrega_est: string;
  segmentos: SegmentoResponse[];
}

export interface EquipajePlanViaje {
  equipaje_id: string;
  estado: string;
  ubicacion_actual: {
    tipo: 'NODO' | 'VUELO';
    referencia_id: string;
    lat: number;
    lon: number;
  } | null;
  estado_sla: string;
  tiempo_entrega_est: string;
  segmentos: SegmentoResponse[];
}

/**
 * Maleta física con identificador único, hija 1:N de un Equipaje.
 * Cada registro de equipaje genera N maletas al registrarse con `cantidad`,
 * cada una con su propio `codigo_maleta` UNIQUE trazable individualmente.
 */
export interface Maleta {
  id: string;
  codigo_maleta: string;
  equipaje_id: string;
  equipaje_id_externo?: string;
  created_at?: string;
  /* true cuando el backend no tiene fila fisica en `maletas` para este equipaje
   * (equipajes importados desde archivos de simulación no llaman a
   * generarMaletasPara), y sintetiza N entradas segun equipaje.cantidad con
   * codigo MAL-{id_externo}-NN. Sirve para que el panel muestre coherencia
   * con la "Carga X/Y" del vuelo. */
  virtual?: boolean;
}

export interface Ubicacion {
  lat: number;
  lon: number;
}

export interface AeropuertoEnMapa extends Aeropuerto {
  color: string;
  ocupacionPorcentaje: number;
  continente?: string;
}

export interface VueloEnMapa extends Vuelo {
  posicionActual?: Ubicacion;
  progreso?: number;
}

export interface MetricasSimulacion {
  sesion_id: string;
  estado: 'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA' | 'COLAPSADA';
  dia_hora_virtual: string;
  segundos_reales_transcurridos: number;
  sla_acumulado_pct: number;
  vuelos_cancelados: number;
  maletas_replanificadas: number;
  maletas_entregadas?: number;
  fecha_inicio_real?: string | null;
  /** virtual/real time ratio sent from backend */
  k?: number;
}

export interface ApiError {
  status: number;
  error: string;
  mensaje: string;
}

export interface PuntoSLA {
  momento_virtual: string;
  sla_pct: number;
  hubo_cancelacion: boolean;
  vuelo_cancelado_ref_id?: string;
}

export interface ReporteSesion {
  sesion_id: string;
  sla_incumplido_pct: number;
  total_replanificadas: number;
  punto_colapso_virtual: string | null;
  nodo_colapso_ref_id: string | null;
  causa_colapso: string | null;
  serie_sla: PuntoSLA[];
}

export interface ReporteOperacion {
  sesion_id: string;
  total_equipajes: number;
  equipajes_registrados: number;
  equipajes_en_vuelo: number;
  equipajes_en_almacen: number;
  equipajes_entregados: number;
  vuelos_programados: number;
  vuelos_en_ruta: number;
  vuelos_completados: number;
  vuelos_cancelados: number;
}

export interface CrearEquipajeRequest {
  destino_iata: string;
  cantidad: number;
}

export interface CrearEquipajeResponse {
  id: string;
  estado: string;
  id_externo?: string;
  origen_iata?: string;
  destino_iata?: string;
}

export interface CargaMasivaRegistro {
  fila: number;
  destino_iata: string;
  cantidad: number;
  estado_validacion: 'VALIDO' | 'REVISION';
  motivo: string | null;
}

export interface CargaMasivaPreview {
  total: number;
  validos: number;
  con_revision: number;
  registros: CargaMasivaRegistro[];
}

export interface CargaMasivaConfirmResponse {
  ingresados: number;
  fallidos: number;
}

export interface AeropuertoTelemetria {
  id: string;
  codigo_iata: string;
  lat: number;
  lon: number;
  capacidad_almacen: number;
  ocupacion_actual: number;
  ocupacion_pct: number;
  color: string;
  continente: string;
  zona_horaria: string;
}

export interface VueloTelemetria {
  id: string;
  codigo_vuelo: string;
  estado: string;
  lat_actual: number;
  lon_actual: number;
  origen_lat: number;
  origen_lon: number;
  destino_lat: number;
  destino_lon: number;
  origen_iata: string;
  destino_iata: string;
  capacidad_carga: number;
  carga_disponible: number;
  ocupacion_pct: number;
  color: string;
  hora_salida: string;
  hora_llegada: string;
  /** 0–1 fraction of route completed, computed server-side from virtual time */
  progreso: number;
}

export interface EnvioItemResponse {
  id: string;
  origen_iata: string;
  destino_iata: string;
  codigo_equipaje: string;
  cantidad: number;
}

export interface EnvioEntregadoResponse {
  origen_iata: string;
  destino_iata: string;
  codigo_vuelo: string;
  cantidad: number;
}

export interface TelemetriaMensaje {
  timestamp: string;
  sesion_id?: string;
  nodos: AeropuertoTelemetria[];
  vuelos: VueloTelemetria[];
  metricas_sesion: MetricasSimulacion;
}

export interface MetricasOperacion {
  total_equipajes: number;
  equipajes_registrados: number;
  equipajes_en_vuelo: number;
  equipajes_en_almacen: number;
  equipajes_entregados: number;
  equipajes_replanificacion: number;
  equipajes_incumplimiento_sla: number;
  vuelos_programados: number;
  vuelos_en_ruta: number;
  vuelos_completados: number;
  vuelos_cancelados: number;
}

export interface EnvioPanelResponse {
  equipaje_id: string;
  origen_iata: string;
  destino_iata: string;
  codigo_vuelo: string;
  estado: string;
  cantidad: number;
}

export interface EquipajeListItem {
  id: string;
  id_externo: string;
  estado: string;
  origen_iata: string;
  destino_iata: string;
  fecha_ingreso: string;
  cantidad: number;
}

export interface RutaDestacada {
  vueloIds: string[];
  coordenadas: [number, number][];
}
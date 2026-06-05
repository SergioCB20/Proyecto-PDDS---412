export type Rol = 'ADMINISTRADOR' | 'OPERADOR_LOGISTICO' | 'ANALISTA';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  estado?: 'ACTIVO' | 'INACTIVO';
  nodo_ref_id: string | null;
  nodo_nombre?: string | null;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface Nodo {
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

export interface Ubicacion {
  lat: number;
  lon: number;
}

export interface NodoEnMapa extends Nodo {
  color: string;
  ocupacionPorcentaje: number;
}

export interface VueloEnMapa extends Vuelo {
  posicionActual?: Ubicacion;
  progreso?: number;
}

export interface MetricasSimulacion {
  sesion_id: string;
  estado: 'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA';
  dia_hora_virtual: string;
  segundos_reales_transcurridos: number;
  sla_acumulado_pct: number;
  vuelos_cancelados: number;
  maletas_replanificadas: number;
}

export interface CrearUsuarioRequest {
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
  nodo_ref_id?: string;
}

export interface ActualizarUsuarioRequest {
  nombre: string;
}

export interface CambiarEstadoRequest {
  estado: 'ACTIVO' | 'INACTIVO';
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

export interface CrearEquipajeRequest {
  id_equipaje: string;
  destino_iata: string;
  vuelo_id: string;
  sla_comprometido: string;
}

export interface CrearEquipajeResponse {
  id: string;
  estado: string;
  id_externo?: string;
  destino_iata?: string;
}

export interface CargaMasivaRegistro {
  fila: number;
  id_equipaje: string;
  destino_iata: string;
  vuelo_id: string;
  sla_comprometido: string;
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

export interface NodoTelemetria {
  id: string;
  codigo_iata: string;
  lat: number;
  lon: number;
  ocupacion_pct: number;
  color: string;
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
  ocupacion_pct: number;
  color: string;
  hora_salida: string;
}

export interface TelemetriaMensaje {
  timestamp: string;
  nodos: NodoTelemetria[];
  vuelos: VueloTelemetria[];
  metricas_sesion: MetricasSimulacion;
}
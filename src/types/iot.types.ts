// src/types/iot.types.ts - Interfaces actualizadas para GPC-300

/* ========= Tipo base de variable ========= */

export interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

/* ========= Datos en vivo (payload PLC) ========= */

// Datos del Generador (26 variables)
export interface GeneratorData {
  // Potencias y FP
  potencia_activa?: VariableData;
  potencia_reactiva?: VariableData;
  potencia_aparente?: VariableData;
  factor_potencia?: VariableData;
  frecuencia?: VariableData;

  // Corrientes
  corriente_L1?: VariableData;
  corriente_L2?: VariableData;
  corriente_L3?: VariableData;

  // Tensiones línea-línea
  voltage_L1_L2?: VariableData;
  voltage_L2_L3?: VariableData;
  voltage_L1_L3?: VariableData;

  // Tensiones fase-neutro
  voltage_L1_N?: VariableData;
  voltage_L2_N?: VariableData;
  voltage_L3_N?: VariableData;

  // Ángulos de fase
  angulo_fase_A?: VariableData;
  angulo_fase_B?: VariableData;
  angulo_fase_C?: VariableData;

  // Secuencias
  secuencia_positiva?: VariableData;
  secuencia_negativa?: VariableData;
  secuencia_zero?: VariableData;

  // Desbalance y promedios
  desbalance_corriente?: VariableData;
  promedio_corrientes?: VariableData;
  promedio_voltajes?: VariableData;

  // Deltas respecto a barra
  delta_L1_barra?: VariableData;
  delta_L2_barra?: VariableData;
  delta_L3_barra?: VariableData;
}

// Datos de la Barra (Busbar) (10 variables)
export interface BusbarData {
  voltage_L1_L2?: VariableData;
  voltage_L2_L3?: VariableData;
  voltage_L1_L3?: VariableData;
  frecuencia?: VariableData;

  angulo_fase_A?: VariableData;
  angulo_fase_B?: VariableData;
  angulo_fase_C?: VariableData;

  secuencia_positiva?: VariableData;
  secuencia_negativa?: VariableData;
  secuencia_zero?: VariableData;
}

// Datos del Breaker (7 variables)
export interface BreakerData {
  voltage_freq_ok?: VariableData;
  opened?: VariableData;
  closed?: VariableData;
  fault?: VariableData;
  ready_to_close?: VariableData;
  sync_in_progress?: VariableData;
  ready_to_open?: VariableData;
}

// Datos de Temperatura (5 variables)
export interface TemperatureData {
  devanado_u?: VariableData;
  devanado_v?: VariableData;
  devanado_w?: VariableData;
  rodamiento_delantero?: VariableData;
  rodamiento_trasero?: VariableData;
}

// Datos de Cilindros del Motor (22 variables)
export interface CylindersData {
  Tem_Cyl_1?: VariableData;
  Tem_Cyl_2?: VariableData;
  Tem_Cyl_3?: VariableData;
  Tem_Cyl_4?: VariableData;
  Tem_Cyl_5?: VariableData;
  Tem_Cyl_6?: VariableData;
  Tem_Cyl_7?: VariableData;
  Tem_Cyl_8?: VariableData;
  Tem_Cyl_9?: VariableData;
  Tem_Cyl_10?: VariableData;
  Tem_Cyl_11?: VariableData;
  Tem_Cyl_12?: VariableData;
  Tem_Cyl_13?: VariableData;
  Tem_Cyl_14?: VariableData;
  Tem_Cyl_15?: VariableData;
  Tem_Cyl_16?: VariableData;
  Tem_Cyl_17?: VariableData;
  Tem_Cyl_18?: VariableData;
  Tem_Cyl_19?: VariableData;
  Tem_Cyl_20?: VariableData;
  Diferencia_temp_clynders?: VariableData;
  Promedio_tem_cyl?: VariableData;
}

// Datos del Sistema de Enfriamiento (4 variables)
export interface CoolingSystemData {
  Temp_LT_salida?: VariableData;
  T_HT_ENTRADA?: VariableData;
  Tem_HT_ref_salida?: VariableData;
  Presion_HT?: VariableData;
}

// Datos del Sistema de Aceite (3 variables)
export interface OilSystemData {
  Temperatura_aceite?: VariableData;
  Tempe_filtro?: VariableData;
  Presion_aceite?: VariableData;
}

// Estructura principal del payload
export interface PLCData {
  generator?: GeneratorData;
  busbar?: BusbarData;
  breaker?: BreakerData;
  temperature?: TemperatureData;
  cylinders?: CylindersData;          // ← NUEVO
  cooling_system?: CoolingSystemData; // ← NUEVO
  oil_system?: OilSystemData;         // ← NUEVO
}

/* ========= Metadatos de mensaje ========= */

export interface MessageMetadata {
  variables_count: number;
  last_update: string;
}

/* ========= Mensaje IoT completo (tal como llega del backend) ========= */

export interface IoTMessage {
  timestamp: string;
  device_id: string;
  device_type: string;
  data: PLCData;
  metadata: MessageMetadata;
}

/* ========= Estructuras para históricos / buffers ========= */

// Punto genérico de serie de tiempo
export interface TimeSeriesPoint {
  timestamp: number; // ms epoch
  value: number;
}

// DataPoint tabular para dashboards históricos (todas las 48 variables)
export interface DataPoint {
  timestamp: number;

  // -------- Generador --------
  gen_potencia_activa?: number;
  gen_potencia_reactiva?: number;
  gen_potencia_aparente?: number;
  gen_frecuencia?: number;
  gen_factor_potencia?: number;

  gen_voltage_L1_N?: number;
  gen_voltage_L2_N?: number;
  gen_voltage_L3_N?: number;
  gen_voltage_L1_L2?: number;
  gen_voltage_L2_L3?: number;
  gen_voltage_L1_L3?: number;

  gen_angulo_fase_A?: number;
  gen_angulo_fase_B?: number;
  gen_angulo_fase_C?: number;

  gen_secuencia_positiva?: number;
  gen_secuencia_negativa?: number;
  gen_secuencia_zero?: number;

  gen_desbalance_corriente?: number;
  gen_delta_L1_barra?: number;
  gen_delta_L2_barra?: number;
  gen_delta_L3_barra?: number;

  gen_corriente_L1?: number;
  gen_corriente_L2?: number;
  gen_corriente_L3?: number;
  gen_promedio_corrientes?: number;
  gen_promedio_voltajes?: number;

  // -------- Busbar (barra) --------
  busbar_voltage_L1_L2?: number;
  busbar_voltage_L2_L3?: number;
  busbar_voltage_L1_L3?: number;
  busbar_frecuencia?: number;

  busbar_angulo_fase_A?: number;
  busbar_angulo_fase_B?: number;
  busbar_angulo_fase_C?: number;

  busbar_secuencia_positiva?: number;
  busbar_secuencia_negativa?: number;
  busbar_secuencia_zero?: number;

  // -------- Temperaturas --------
  temp_devanado_u?: number;
  temp_devanado_v?: number;
  temp_devanado_w?: number;
  temp_rodamiento_delantero?: number;
  temp_rodamiento_trasero?: number;

  // -------- Breaker (booleans) --------
  breaker_closed?: boolean;
  breaker_fault?: boolean;
  breaker_opened?: boolean;
  breaker_ready_to_close?: boolean;
  breaker_sync_in_progress?: boolean;
  breaker_ready_to_open?: boolean;
  breaker_voltage_freq_ok?: boolean;
}

// Buffer de series concretas para gráficas en tiempo real (las que ya usas)
export interface BufferData {
  corriente_L1: TimeSeriesPoint[];
  corriente_L2: TimeSeriesPoint[];
  corriente_L3: TimeSeriesPoint[];

  voltage_L1_N: TimeSeriesPoint[];
  voltage_L2_N: TimeSeriesPoint[];
  voltage_L3_N: TimeSeriesPoint[];

  promedio_corrientes: TimeSeriesPoint[];
  promedio_voltajes: TimeSeriesPoint[];

  frecuencia: TimeSeriesPoint[];
  potencia_activa: TimeSeriesPoint[];

  // Busbar series (si las usas)
  busbar_voltage_L1_L2?: TimeSeriesPoint[];
  busbar_voltage_L2_L3?: TimeSeriesPoint[];
  busbar_voltage_L1_L3?: TimeSeriesPoint[];
  busbar_frecuencia?: TimeSeriesPoint[];

  // Deltas / desbalance
  delta_L1_barra?: TimeSeriesPoint[];
  delta_L2_barra?: TimeSeriesPoint[];
  delta_L3_barra?: TimeSeriesPoint[];
  desbalance_corriente?: TimeSeriesPoint[];
}

/* ========= Helpers ========= */

export function getNumericValue(data: VariableData | undefined): number | null {
  if (!data || data.value === undefined) return null;
  return typeof data.value === "number" ? data.value : null;
}

export function getBooleanValue(data: VariableData | undefined): boolean | null {
  if (!data || data.value === undefined) return null;
  return typeof data.value === "boolean" ? data.value : null;
}

export function getTemperatureStatus(
  temp: number | null
): "normal" | "warning" | "critical" {
  if (temp === null) return "normal";
  if (temp > 90) return "critical";
  if (temp > 80) return "warning";
  return "normal";
}

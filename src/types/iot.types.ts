// src/types/iot.types.ts - Interfaces actualizadas para GPC-300

export interface VariableData {
  value: number | boolean | string;
  timestamp: string;
}

// Datos del Generador (actualizado según JSON real)
export interface GeneratorData {
  potencia_activa?: VariableData;
  potencia_reactiva?: VariableData;
  potencia_aparente?: VariableData;
  factor_potencia?: VariableData;
  frecuencia?: VariableData;
  corriente_L1?: VariableData;
  corriente_L2?: VariableData;
  corriente_L3?: VariableData;
  voltage_L1_L2?: VariableData;
  voltage_L2_L3?: VariableData;
  voltage_L1_L3?: VariableData;
  voltage_L1_N?: VariableData;
  voltage_L2_N?: VariableData;
  voltage_L3_N?: VariableData;
  angulo_fase_A?: VariableData;
  angulo_fase_B?: VariableData;
  angulo_fase_C?: VariableData;
  secuencia_positiva?: VariableData;
  secuencia_negativa?: VariableData;
  secuencia_zero?: VariableData;
  desbalance_corriente?: VariableData;
  promedio_corrientes?: VariableData;
  promedio_voltajes?: VariableData;
  delta_L1_barra?: VariableData;
  delta_L2_barra?: VariableData;
  delta_L3_barra?: VariableData;
}

// Datos de la Barra (Busbar)
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

// Datos del Breaker
export interface BreakerData {
  voltage_freq_ok?: VariableData;
  opened?: VariableData;
  closed?: VariableData;
  fault?: VariableData;
  ready_to_close?: VariableData;
  sync_in_progress?: VariableData;
  ready_to_open?: VariableData;
}

// Datos de Temperatura
export interface TemperatureData {
  devanado_u?: VariableData;
  devanado_v?: VariableData;
  devanado_w?: VariableData;
  rodamiento_delantero?: VariableData;
  rodamiento_trasero?: VariableData;
}

// Estructura principal
export interface PLCData {
  generator?: GeneratorData;
  busbar?: BusbarData;
  breaker?: BreakerData;
  temperature?: TemperatureData;
}

export interface MessageMetadata {
  variables_count: number;
  last_update: string;
}

export interface IoTMessage {
  timestamp: string;
  device_id: string;
  device_type: string;
  data: PLCData;
  metadata: MessageMetadata;
}

// Para buffer de datos históricos
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

// DataPoint para gráficos históricos
export interface DataPoint {
  timestamp: number;
  // Generador
  gen_potencia_activa?: number;
  gen_potencia_reactiva?: number;
  gen_potencia_aparente?: number;
  gen_frecuencia?: number;
  gen_factor_potencia?: number;
  gen_voltage_L1_N?: number;
  gen_voltage_L2_N?: number;
  gen_voltage_L3_N?: number;
  gen_corriente_L1?: number;
  gen_corriente_L2?: number;
  gen_corriente_L3?: number;
  gen_promedio_corrientes?: number;
  gen_promedio_voltajes?: number;
  // Temperaturas
  temp_devanado_u?: number;
  temp_devanado_v?: number;
  temp_devanado_w?: number;
  temp_rodamiento_delantero?: number;
  temp_rodamiento_trasero?: number;
  // Breaker
  breaker_closed?: boolean;
  breaker_fault?: boolean;
}

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
}

// Helpers
export function getNumericValue(data: VariableData | undefined): number | null {
  if (!data || data.value === undefined) return null;
  return typeof data.value === 'number' ? data.value : null;
}

export function getBooleanValue(data: VariableData | undefined): boolean | null {
  if (!data || data.value === undefined) return null;
  return typeof data.value === 'boolean' ? data.value : null;
}

export function getTemperatureStatus(temp: number | null): 'normal' | 'warning' | 'critical' {
  if (temp === null) return 'normal';
  if (temp > 90) return 'critical';
  if (temp > 80) return 'warning';
  return 'normal';
}
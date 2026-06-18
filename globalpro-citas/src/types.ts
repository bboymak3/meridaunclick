// src/types.ts — TypeScript types for GlobalPro Citas

export interface Env {
  AI: Ai;
  DB: D1Database;
  ASSETS: Fetcher;
  BUSINESS_PHONE: string;
  BUSINESS_NAME: string;
  VEHICULO_API: string;
  ULTRAMSG_INSTANCE_ID?: string;
  ULTRAMSG_TOKEN?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CitaRequest {
  patente: string;
  nombre: string;
  telefono: string;
  email?: string;
  servicio: string;
  fecha: string;
  hora: string;
  observaciones?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  canal?: string;
}

export interface CitaRecord {
  id: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  cilindrada: string | null;
  nombre_cliente: string;
  telefono: string;
  email: string | null;
  servicio: string;
  fecha_cita: string;
  hora_cita: string;
  duracion_minutos: number;
  observaciones: string | null;
  estado: string;
  canal: string;
  notificada_negocio: number;
  notificada_cliente: number;
  recordatorio_enviado: number;
  created_at: string;
  updated_at: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  icono: string;
  duracion_minutos: number;
  precio_min: string | null;
  activo: number;
  orden: number;
}

export interface Horario {
  dia_semana: string;
  hora_apertura: string;
  hora_cierre: string;
  intervalo_minutos: number;
  activo: number;
}

export interface SlotDisponible {
  hora: string;
  disponibles: number;
  maximo: number;
}

export interface VehiculoData {
  success: boolean;
  vehiculo?: {
    marca: string;
    modelo: string;
    anio: number;
    patente_placa: string;
    cilindrada?: string;
    combustible?: string;
    kilometraje?: string;
    cliente?: {
      nombre: string;
      rut: string;
      telefono: string;
      email?: string;
    };
    total_ordenes?: number;
    ordenes?: any[];
  };
}

// frontend/src/utils/validators.js

import { z } from 'zod';

/**
 * Esquema de validación para registro
 */
export const registerSchema = z.object({
  nombreCompleto: z
    .string()
    .min(1, 'Este campo es requerido')  // RF-06.01.01
    .min(3, 'Nombre completo debe tener al menos 3 caracteres'),
  
  email: z
    .string()
    .min(1, 'Este campo es requerido')  // RF-06.01.01
    .email('Email inválido'),  // RF-06.02.03
  
  password: z
    .string()
    .min(1, 'Este campo es requerido')  // RF-06.01.01
    .min(8, 'La contraseña debe contener mínimo 8 caracteres')  // RF-01.03.01
    .regex(
      /\d/,
      'La contraseña debe contener al menos 1 carácter numérico'  // RF-01.03.02
    )
    .regex(
      /[!@#$%&*()_+\-=\[\]{}<>?]/,
      'La contraseña debe contener al menos 1 carácter especial'  // RF-01.03.03
    ),
  
  confirmPassword: z
    .string()
    .min(1, 'Este campo es requerido')  // RF-06.01.01
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',  // RF-01.02.02, RF-06.01.05
  path: ['confirmPassword']
});

/**
 * Esquema de validación para login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Dont leave it blank')  // RF-02.03.01
    .email('Email inválido'),
  
  password: z
    .string()
    .min(1, 'Dont leave it blank')  // RF-02.03.01
});

/**
 * RF-03.01 - Esquema para forgot password
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Dont leave it blank')
    .email('Email inválido')
});

/**
 * RF-03.03 - Esquema para reset password
 */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Dont leave it blank')
    .email('Email inválido'),
  
  token: z
    .string()
    .min(1, 'Recovery code is required'),
  
  newPassword: z
    .string()
    .min(1, 'Dont leave it blank')
    .min(8, 'La contraseña debe contener mínimo 8 caracteres')
    .regex(/\d/, 'La contraseña debe contener al menos 1 carácter numérico')
    .regex(/[!@#$%&*()_+\-=\[\]{}<>?]/, 'La contraseña debe contener al menos 1 carácter especial'),
  
  confirmPassword: z
    .string()
    .min(1, 'Dont leave it blank')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

/**
 * RF-04.02 - Esquema para editar perfil (nombre)
 */
export const profileSchema = z.object({
  nombreCompleto: z
    .string()
    .min(1, 'Dont leave it blank')  // RF-04.02.02
    .min(3, 'Full name must be at least 3 characters')
});

/**
 * RF-04.03 - Esquema para cambiar contraseña
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Dont leave it blank'),
  
  newPassword: z
    .string()
    .min(1, 'Dont leave it blank')
    .min(8, 'La contraseña debe contener mínimo 8 caracteres')  // RF-04.03.02 (RF-01.03.01)
    .regex(/\d/, 'La contraseña debe contener al menos 1 carácter numérico')  // RF-04.03.02 (RF-01.03.02)
    .regex(/[!@#$%&*()_+\-=\[\]{}<>?]/, 'La contraseña debe contener al menos 1 carácter especial'),  // RF-04.03.02 (RF-01.03.03)
  
  confirmPassword: z
    .string()
    .min(1, 'Dont leave it blank')
}).refine((data) => data.newPassword === data.confirmPassword, {  // RF-04.03.03
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

/**
 * RF-01 - Esquema para Destino y Fechas (Trip Builder Paso 1)
 */
export const destinationSchema = z.object({
  origin: z  // ✅ NUEVO: Origen
    .string()
    .min(1, 'Origin is required')
    .min(3, 'Origin must be at least 3 characters'),
  
  destination: z
    .string()
    .min(1, 'Destination is required')
    .min(3, 'Destination must be at least 3 characters'),
  
  startDate: z
    .string()
    .min(1, 'Start date is required'),
  
  endDate: z
    .string()
    .min(1, 'End date is required')
});

/**
 * RF-02, RF-03, RF-04 - Esquema para Viajeros, Intereses y Presupuesto (Paso 2)
 */
export const travelersSchema = z.object({
  travelers: z
    .array(z.object({
      name: z.string().min(1, 'Traveler name is required'),
      type: z.enum(['adult', 'child', 'infant']),
      interests: z.array(z.string()).max(4, 'Maximum 4 interests per traveler').optional()  // ✅ RF-03.01.03
    }))
    .min(1, 'At least 1 traveler is required')
    .max(4, 'Maximum 4 travelers allowed'),
  
  budget: z
    .number()
    .min(500, 'Minimum budget is 500'),  // ✅ RF-04.02.01
  
  currency: z.enum(['USD', 'MXN', 'EUR']),  // ✅ RF-04.01.02-04
  
  budgetDistribution: z.object({
    flights: z.number().min(0).max(100).optional(),
    hotels: z.number().min(0).max(100).optional(),
    food: z.number().min(0).max(100).optional(),
    activities: z.number().min(0).max(100).optional(),
    transport: z.number().min(0).max(100).optional()
  }).optional()  // ✅ RF-04.03 - Opcional
});

/**
 * RF-03.02, RF-03.03, RF-03.04 - Esquema para Preferencias (Paso 3)
 */
export const preferencesSchema = z.object({
  preferences: z.object({
    avoidCrowds: z.boolean().optional(),  // ✅ RF-03.02.01
    ecoFriendly: z.boolean().optional(),  // ✅ RF-03.02.02
    wheelchairAccessible: z.boolean().optional(),  // ✅ RF-03.02.03
    familyFriendly: z.boolean().optional(),  // ✅ RF-03.02.04
    petFriendly: z.boolean().optional()  // ✅ RF-03.02.05
  }).optional(),  // ✅ RF-03.02.06 - Opcional
  
  hotelClass: z.enum(['no-preference', '1', '2', '3', '4', '5']).optional(),  // ✅ RF-03.03 - Opcional
  
  flightClass: z.enum(['economy', 'business', 'first']).optional(),  // ✅ RF-03.04 - Opcional
  
  // ✅ RF-03.02.07 - TextField opcional con límite de 200 caracteres
  customPreferences: z.string()
    .max(200, 'Maximum 200 characters allowed')
    .optional()
});
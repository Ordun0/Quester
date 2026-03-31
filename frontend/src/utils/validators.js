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
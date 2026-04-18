import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(255, "Email too long")
  .email("Email must contain a valid @ address")
  .refine((v) => v.includes("@"), "Email must contain @");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long")
  .refine((v) => /[A-Z]/.test(v), "Must contain an uppercase letter")
  .refine((v) => /[a-z]/.test(v), "Must contain a lowercase letter")
  .refine((v) => /[0-9]/.test(v), "Must contain a number")
  .refine((v) => /[!@#$%^&*(),.?":{}|<>_\-+=\\[\]/~`';]/.test(v), "Must contain a special character");

export const fullNameSchema = z.string().trim().min(2, "Name too short").max(80, "Name too long");

export const signupSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72),
});

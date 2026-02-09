import { z } from "zod";

export const descrizioneSchema = z
    .string()
    .trim()
    .min(1, "Inserisci una descrizione")
    .max(100, "Massimo 100 caratteri")
    .transform((val) => val.replace(/\s+/g, ""));
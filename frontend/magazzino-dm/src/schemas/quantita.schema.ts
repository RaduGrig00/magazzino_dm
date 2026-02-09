import { z } from "zod";

const QTA_MIN = 1;
const QTA_MAX = 99999;

export const quantitaSchema = z
    .string()
    .trim()
    .min(1, "Inserisci una quantità")
    .regex(/^\d+&/, "Inserisci un numero intero valido")
    .transform((val) => parseInt(val, 10))
    .pipe(
        z.number()
            .min(QTA_MIN, `La quantità deve essere almeno ${QTA_MIN}`)
            .max(QTA_MAX, `La quantità non può superare ${QTA_MAX}`)
    );
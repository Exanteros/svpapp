import { z } from 'zod';
import {
  TOURNAMENT_DEFAULTS,
  categoryNeedsSkill,
  type AnmeldungPayload,
} from './tournament';

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional()
);

export const registrationRequestSchema = z.object({
  verein: z.string().trim().min(1, 'Verein fehlt'),
  kontakt: z.string().trim().min(1, 'Ansprechpartner fehlt'),
  email: z.string().trim().email('Ungültige E-Mail-Adresse'),
  mobil: z.string().trim().min(1, 'Mobilnummer fehlt'),
  teams: z
    .array(
      z.object({
        kategorie: z.string().trim().min(1, 'Kategorie fehlt'),
        anzahl: z.coerce
          .number()
          .int('Teamanzahl muss eine ganze Zahl sein')
          .min(1, 'Mindestens ein Team erforderlich')
          .max(
            TOURNAMENT_DEFAULTS.maxTeamsPerCategorySelection,
            `Maximal ${TOURNAMENT_DEFAULTS.maxTeamsPerCategorySelection} Teams pro Auswahl`
          ),
        schiri: z.boolean(),
        spielstaerke: optionalTrimmedString,
      })
    )
    .min(1, 'Mindestens eine Team-Anmeldung erforderlich'),
}).superRefine((data, context) => {
  data.teams.forEach((team, index) => {
    if (categoryNeedsSkill(team.kategorie) && !team.spielstaerke) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teams', index, 'spielstaerke'],
        message: `Spielstärke für ${team.kategorie} fehlt`,
      });
    }
  });
});

export type RegistrationRequest = z.infer<typeof registrationRequestSchema> & AnmeldungPayload;

export function formatRegistrationValidationError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(', ');
}

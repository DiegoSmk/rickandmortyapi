import { z } from "zod";

const boundedScore = z.number().min(0).max(100);
const boundedConfidence = z.number().min(0).max(1);

export const aiCharacterOutputSchema = z.object({
  character_id: z.string().min(1),
  analysis_version: z.string().min(1),
  attributes: z.object({
    caos: boundedScore,
    sobrevivencia: boundedScore,
    instabilidade: boundedScore,
    genialidade: boundedScore,
    influencia: boundedScore,
    vitalidade: boundedScore
  }),
  attribute_reasoning: z.object({
    caos: z.string().min(1),
    sobrevivencia: z.string().min(1),
    instabilidade: z.string().min(1),
    genialidade: z.string().min(1),
    influencia: z.string().min(1),
    vitalidade: z.string().min(1)
  }),
  traits: z.array(
    z.object({
      slug: z.string().min(1),
      score: boundedScore,
      reason: z.string().min(1),
      confidence: boundedConfidence
    })
  ).max(5),
  weaknesses: z.array(
    z.object({
      slug: z.string().min(1),
      score: boundedScore,
      reason: z.string().min(1),
      confidence: boundedConfidence
    })
  ).max(5),
  abilities: z.array(
    z.object({
      slug: z.string().min(1),
      power_level: boundedScore,
      reason: z.string().min(1),
      confidence: boundedConfidence
    })
  ).max(3),
  narrative_summary: z.string().min(1),
  confidence: z.object({
    overall: boundedConfidence,
    attributes: boundedConfidence,
    traits: boundedConfidence,
    weaknesses: boundedConfidence,
    abilities: boundedConfidence
  }),
  evidence_summary: z.array(z.string().min(1)).min(1).max(8)
});

export type AiCharacterOutput = z.infer<typeof aiCharacterOutputSchema>;

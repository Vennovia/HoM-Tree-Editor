'use server';
/**
 * @fileOverview A Genkit flow that generates a lore-friendly description for a spell node.
 *
 * - generateSpellLore - A function that handles the lore generation process.
 * - GenerateSpellLoreInput - The input type for the generateSpellLore function.
 * - GenerateSpellLoreOutput - The return type for the generateSpellLore function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSpellLoreInputSchema = z.object({
  nodeName: z
    .string()
    .describe('The name of the spell node (e.g., "Wish - Transform", "Crown\u0027s Vortex").'),
  school: z
    .string()
    .describe('The school of magic the spell belongs to (e.g., "Alteration", "Conjuration").'),
  effects: z
    .string()
    .describe('A brief description of what the spell does, or its primary function.'),
});
export type GenerateSpellLoreInput = z.infer<typeof GenerateSpellLoreInputSchema>;

const GenerateSpellLoreOutputSchema = z.object({
  loreDescription: z.string().describe('A lore-friendly description for the spell node.'),
});
export type GenerateSpellLoreOutput = z.infer<typeof GenerateSpellLoreOutputSchema>;

export async function generateSpellLore(
  input: GenerateSpellLoreInput
): Promise<GenerateSpellLoreOutput> {
  return generateSpellLoreFlow(input);
}

const generateSpellLorePrompt = ai.definePrompt({
  name: 'generateSpellLorePrompt',
  input: {
    schema: GenerateSpellLoreInputSchema,
  },
  output: {
    schema: GenerateSpellLoreOutputSchema,
  },
  prompt: `You are an expert loremaster and mod developer for a fantasy role-playing game.
Your task is to create a lore-friendly description for a spell node in a spell tree.
The description should be evocative, fit the given school of magic, and hint at the spell's effects without being overly mechanical.

Spell Node Name: {{{nodeName}}}
School of Magic: {{{school}}}
Primary Effects: {{{effects}}}

Generate a lore-friendly description for this spell:`,
});

const generateSpellLoreFlow = ai.defineFlow(
  {
    name: 'generateSpellLoreFlow',
    inputSchema: GenerateSpellLoreInputSchema,
    outputSchema: GenerateSpellLoreOutputSchema,
  },
  async (input) => {
    const { output } = await generateSpellLorePrompt(input);
    return output!;
  }
);

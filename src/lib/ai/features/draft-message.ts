import { z } from "zod";
import { generateJson, type AiSource } from "@/lib/ai/provider";
import type { Locale } from "@/i18n/config";

export type DraftContext = {
  /** "buyer" drafts an enquiry to a seller; "seller" drafts an approach to a buyer. */
  direction: "buyerToSeller" | "sellerToBuyer";
  senderName: string;
  senderCompany: string;
  recipientName: string;
  assetTitle: string | null;
  assetFacts: string;
  mandateFacts: string;
};

export type DraftResult = { text: string; source: AiSource };

const TEMPLATES: Record<DraftContext["direction"], Record<Locale, (c: DraftContext) => string>> = {
  buyerToSeller: {
    en: (c) =>
      [
        `Hello ${c.recipientName},`,
        "",
        `I am ${c.senderName}${c.senderCompany ? ` from ${c.senderCompany}` : ""} and I am looking at ${c.assetTitle ?? "your listing"}.`,
        "",
        "It fits our mandate, and before we go further I would like to understand three things:",
        "1. The revenue split by client segment over the last 12 months.",
        "2. The current licence status and any open items with the regulator.",
        "3. What exactly is included in the perimeter, and the expected timeline.",
        "",
        "Happy to sign an NDA first if that is easier.",
        "",
        "Best regards,",
        c.senderName,
      ].join("\n"),
    uk: (c) =>
      [
        `Вітаю, ${c.recipientName}!`,
        "",
        `Мене звати ${c.senderName}${c.senderCompany ? `, ${c.senderCompany}` : ""}. Розглядаю ${c.assetTitle ?? "ваш лістинг"}.`,
        "",
        "Актив відповідає нашому мандату. Перед наступним кроком хотів би зрозуміти три речі:",
        "1. Структуру виручки за клієнтськими сегментами за останні 12 місяців.",
        "2. Поточний статус ліцензії та відкриті питання з регулятором.",
        "3. Що саме входить у перимітр угоди та орієнтовні строки.",
        "",
        "Готові спершу підписати NDA, якщо так зручніше.",
        "",
        "З повагою,",
        c.senderName,
      ].join("\n"),
  },
  sellerToBuyer: {
    en: (c) =>
      [
        `Hello ${c.recipientName},`,
        "",
        `I am ${c.senderName}${c.senderCompany ? ` from ${c.senderCompany}` : ""}. Based on your mandate, ${c.assetTitle ?? "an asset we are selling"} looks like a fit.`,
        "",
        "Short version of what is on the table:",
        c.assetFacts || "— see the listing for financials and licence details.",
        "",
        "If it is relevant, I can share the data room index and last-year financials under NDA.",
        "",
        "Best regards,",
        c.senderName,
      ].join("\n"),
    uk: (c) =>
      [
        `Вітаю, ${c.recipientName}!`,
        "",
        `Мене звати ${c.senderName}${c.senderCompany ? `, ${c.senderCompany}` : ""}. Судячи з вашого мандата, ${c.assetTitle ?? "наш актив"} може вам пасувати.`,
        "",
        "Коротко про предмет:",
        c.assetFacts || "— фінанси та деталі ліцензії є в лістингу.",
        "",
        "Якщо релевантно — надішлю опис data room та фінанси за минулий рік під NDA.",
        "",
        "З повагою,",
        c.senderName,
      ].join("\n"),
  },
};

export function draftMessageDeterministic(context: DraftContext, locale: Locale): DraftResult {
  return { text: TEMPLATES[context.direction][locale](context), source: "heuristic" };
}

const aiSchema = z.object({ message: z.string().min(20) });

const SYSTEM = `You write the first outreach message between two professionals on an M&A marketplace.
Constraints:
- 90-150 words, plain text, no markdown, no subject line.
- Reference only facts given to you. Never invent figures, names or claims.
- End with 2-3 specific, high-signal questions or next steps.
- Tone: direct, senior, no sales language, no flattery.`;

export async function draftMessage(context: DraftContext, locale: Locale): Promise<DraftResult> {
  const result = await generateJson({
    system: SYSTEM,
    temperature: 0.6,
    prompt: [
      `Write in ${locale === "uk" ? "Ukrainian" : "English"}.`,
      `Direction: ${context.direction === "buyerToSeller" ? "buyer writing to seller" : "seller writing to buyer"}`,
      `Sender: ${context.senderName}${context.senderCompany ? ` (${context.senderCompany})` : ""}`,
      `Recipient: ${context.recipientName}`,
      context.assetTitle ? `Asset: ${context.assetTitle}` : "",
      context.assetFacts ? `Asset facts: ${context.assetFacts}` : "",
      context.mandateFacts ? `Buyer mandate: ${context.mandateFacts}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    schema: aiSchema,
    responseSchema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    },
  });

  if (!result.ok) return draftMessageDeterministic(context, locale);
  return { text: result.data.message.trim().slice(0, 2000), source: "ai" };
}

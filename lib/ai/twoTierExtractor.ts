/**
 * Two-Tier Hybrid AI Job Extraction Engine.
 * 
 * Tier 1: Zero-latency deterministic Regex & heuristics (handles 80%+ of offers at 0ms and $0).
 * Tier 2: LLM JSON Schema structured extractor (resolves ambiguous, slang, and complex job postings).
 */

import { extractJobTraits, extractPhoneNumber, ExtractedJobTraits } from './freeJobExtractor';
import { extractRequirements, ExtractedRequirement } from './extractor';

/**
 * Parses numeric PLN prices safely from dirty text strings (e.g. "1 500,00 zł", "1500 PLN", "do negocjacji").
 */
export function parseCleanPrice(priceText: string | null | undefined): number | null {
  if (!priceText) return null;

  const lower = priceText.toLowerCase().trim();
  const nonNumericKeywords = [
    'do negocjacji',
    'zamienię',
    'za darmo',
    'bezpłatne',
    'darmowe',
    'zapytaj o cenę',
    'cena do uzgodnienia',
  ];
  if (nonNumericKeywords.some((keyword) => lower.includes(keyword))) {
    return null;
  }

  // Handle range formats like "35 - 45 zł", "6000 - 8000 zł", "35-45 zł/h"
  const rangeMatch = lower.match(/(\d[\d\s,.]*)\s*(?:-|–|do)\s*(\d[\d\s,.]*)/);
  if (rangeMatch && rangeMatch[1]) {
    const cleanFrom = rangeMatch[1].replace(/\s+/g, '').replace(/,/g, '.');
    const valFrom = parseFloat(cleanFrom);
    if (Number.isFinite(valFrom) && valFrom > 0) return valFrom;
  }

  const cleaned = priceText
    .replace(/\s+/g, '')
    .replace(/zł/gi, '')
    .replace(/PLN/gi, '')
    .replace(/eur/gi, '')
    .replace(/,/g, '.');

  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const val = parseFloat(match[1]);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export interface EnrichedJobData {
  title: string;
  description: string;
  price: number | null;
  salaryParsed: ExtractedJobTraits['salary_parsed'];
  phone: string | null;
  employmentType: string;
  certifications: string[];
  benefits: string[];
  requirements: ExtractedRequirement[];
  tradeTags?: string[];
  isFraudSuspicious: boolean;
  tierUsed: 'tier1_fast_regex' | 'tier2_structured_llm';
  confidenceScore: number; // 0.0 to 1.0
}

export interface LlmExtractorFn {
  (prompt: string): Promise<{
    salaryMin?: number;
    salaryMax?: number;
    salaryUnit?: 'hourly' | 'daily' | 'piecework' | 'monthly' | 'project';
    employmentType?: string;
    certifications?: string[];
    benefits?: string[];
    tradeTags?: string[];
    phone?: string;
  } | null>;
}

/**
 * Evaluates completeness and confidence of fast-path extraction.
 */
function calculateTier1Confidence(traits: ExtractedJobTraits, price: number | null, phone: string | null): number {
  let score = 0.5;

  if (price !== null || traits.salary_parsed !== null) score += 0.2;
  if (phone !== null) score += 0.15;
  if (traits.certifications.length > 0) score += 0.1;
  if (traits.benefits.length > 0) score += 0.05;

  return Math.min(1.0, score);
}

/**
 * Slang & colloquial construction phrase detector for Polish ads.
 */
function containsConstructionSlang(text: string): boolean {
  const slangRx = /na\s+(?:rękę|czysto|czarno)|dyszek|piątka|do\s+łapy|fucha|regipsy|flizy|szpachla|robota\s+od\s+zaraz/i;
  return slangRx.test(text);
}

/**
 * Master Two-Tier Extraction Coordinator.
 */
export async function extractEnrichedJobData(
  title: string,
  description: string,
  rawPrice?: string | number | null,
  llmFallback?: LlmExtractorFn
): Promise<EnrichedJobData> {
  const fullText = `${title} ${description}`;
  const fastPrice = typeof rawPrice === 'number' ? rawPrice : parseCleanPrice(String(rawPrice || ''));
  const fastPhone = extractPhoneNumber(fullText);
  const fastTraits = extractJobTraits(title, description, rawPrice, fastPhone);
  const fastBadges = extractRequirements(title, description);

  const confidence = calculateTier1Confidence(fastTraits, fastPrice, fastPhone);
  const isSlangHeavy = containsConstructionSlang(fullText);

  // If Fast Path has high confidence and no complex slang requiring LLM
  if (confidence >= 0.75 && !isSlangHeavy || !llmFallback) {
    return {
      title,
      description,
      price: fastPrice,
      salaryParsed: fastTraits.salary_parsed,
      phone: fastPhone,
      employmentType: fastTraits.employment_type_normalized,
      certifications: fastTraits.certifications,
      benefits: fastTraits.benefits,
      requirements: fastBadges,
      tradeTags: fastTraits.trade_tags,
      isFraudSuspicious: fastTraits.fraud_analysis.isSuspicious,
      tierUsed: 'tier1_fast_regex',
      confidenceScore: confidence,
    };
  }

  // Tier 2: LLM Structured Fallback for complex/slang-heavy descriptions
  try {
    const llmResult = await llmFallback(
      `Przeanalizuj ofertę budowlaną: "${title}"\nTreść: "${description}"`
    );

    if (llmResult) {
      const mergedSalary = llmResult.salaryMin
        ? {
            min: llmResult.salaryMin,
            max: llmResult.salaryMax || llmResult.salaryMin,
            currency: 'PLN',
            unit: llmResult.salaryUnit || 'monthly',
          }
        : fastTraits.salary_parsed;

      return {
        title,
        description,
        price: fastPrice || (llmResult.salaryMin ?? null),
        salaryParsed: mergedSalary,
        phone: fastPhone || llmResult.phone || null,
        employmentType: llmResult.employmentType || fastTraits.employment_type_normalized,
        certifications: Array.from(new Set([...fastTraits.certifications, ...(llmResult.certifications || [])])),
        benefits: Array.from(new Set([...fastTraits.benefits, ...(llmResult.benefits || [])])),
        requirements: fastBadges,
        tradeTags: Array.from(new Set([...(fastTraits.trade_tags || []), ...(llmResult.tradeTags || [])])),
        isFraudSuspicious: fastTraits.fraud_analysis.isSuspicious,
        tierUsed: 'tier2_structured_llm',
        confidenceScore: 0.95,
      };
    }
  } catch {
    /* fallback to Tier 1 on LLM error */
  }

  return {
    title,
    description,
    price: fastPrice,
    salaryParsed: fastTraits.salary_parsed,
    phone: fastPhone,
    employmentType: fastTraits.employment_type_normalized,
    certifications: fastTraits.certifications,
    benefits: fastTraits.benefits,
    requirements: fastBadges,
    tradeTags: fastTraits.trade_tags,
    isFraudSuspicious: fastTraits.fraud_analysis.isSuspicious,
    tierUsed: 'tier1_fast_regex',
    confidenceScore: confidence,
  };
}

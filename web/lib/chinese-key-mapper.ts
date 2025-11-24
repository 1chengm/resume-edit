import { z } from 'zod'
import { JDMatchSchema, type JDMatch } from '@/types/ai'

/**
 * Maps Chinese keys from DeepSeek responses to English keys
 * Expected Chinese keys:
 * - 匹配得分 -> match_score
 * - 优势 -> strengths
 * - 差距 -> gaps
 * - 优化建议 -> recommendations
 */

export interface ChineseJDMatchResponse {
  匹配得分?: number | null
  优势?: string[] | null
  差距?: string[] | null
  优化建议?: string[] | null
}

export interface EnglishJDMatchResponse {
  match_score?: number
  strengths?: string[]
  gaps?: string[]
  recommendations?: string[]
}

/**
 * Checks if an object has Chinese keys (DeepSeek response)
 */
export function hasChineseKeys(obj: unknown): obj is ChineseJDMatchResponse {
  if (!obj || typeof obj !== 'object') return false
  
  const chineseKeys = ['匹配得分', '优势', '差距', '优化建议']
  return chineseKeys.some(key => key in obj)
}

/**
 * Maps Chinese keys to English keys for JD Match response
 * Converts string values to arrays where needed
 */
export function mapChineseKeysToEnglish(chineseResponse: ChineseJDMatchResponse): EnglishJDMatchResponse {
  // Helper to ensure value is an array
  const ensureArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value) return [value]
    return []
  }
  
  return {
    match_score: chineseResponse.匹配得分 || 0,
    strengths: ensureArray(chineseResponse.优势),
    gaps: ensureArray(chineseResponse.差距),
    recommendations: ensureArray(chineseResponse.优化建议)
  }
}

/**
 * Normalizes a JD Match response (handles both Chinese and English keys)
 * Returns a normalized response with English keys that can be validated by Zod
 */
export function normalizeJDMatchResponse(response: unknown): JDMatch {
  // If response is already in English format, return as is
  if (!hasChineseKeys(response)) {
    // Validate and return
    const result = JDMatchSchema.safeParse(response)
    if (result.success) {
      return result.data
    }
    
    // If validation fails but response looks mostly correct, enrich it
    const fallback: JDMatch = {
      match_score: 0,
      strengths: [],
      gaps: [],
      recommendations: []
    }
    
    if (response && typeof response === 'object') {
      return {
        match_score: (response as any).match_score ?? fallback.match_score,
        strengths: Array.isArray((response as any).strengths) ? (response as any).strengths : fallback.strengths,
        gaps: Array.isArray((response as any).gaps) ? (response as any).gaps : fallback.gaps,
        recommendations: Array.isArray((response as any).recommendations) ? (response as any).recommendations : fallback.recommendations
      }
    }
    
    return fallback
  }
  
  // Response has Chinese keys, map them to English
  const englishResponse = mapChineseKeysToEnglish(response)
  
  // Validate with Zod
  const validationResult = JDMatchSchema.safeParse(englishResponse)
  
  if (validationResult.success) {
    return validationResult.data
  }
  
  // If validation fails, return a fallback response
  console.error('Validation failed for mapped response:', validationResult.error)
  return {
    match_score: englishResponse.match_score || 0,
    strengths: englishResponse.strengths || [],
    gaps: englishResponse.gaps || [],
    recommendations: englishResponse.recommendations || []
  }
}

/**
 * Attempts to parse a JSON string that might contain Chinese keys
 */
export function parseChineseJSON(jsonString: string): JDMatch {
  let parsed: unknown
  
  try {
    // Try to parse the JSON
    const cleanText = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleanText)
  } catch (parseError) {
    console.error('Failed to parse JSON:', parseError)
    console.error('Raw text:', jsonString)
    
    // Return empty fallback
    return {
      match_score: 0,
      strengths: [],
      gaps: [],
      recommendations: []
    }
  }
  
  // Normalize the parsed response
  return normalizeJDMatchResponse(parsed)
}
/**
 * Auto-column-detection and confidence-scoring CSV column mapper.
 *
 * This module sits ON TOP of CopiScope's existing PapaParse-based CSV parser.
 * After PapaParse produces headers + rows, pass the headers through
 * `autoDetectColumns` to get a best-guess `ColumnMapping`, then use
 * `isMappingComplete` / `getMappingConfidence` to decide whether the user
 * needs to confirm or adjust the mapping before processing.
 */

import type { ColumnMapping } from '@/types/usage';

// ---------------------------------------------------------------------------
// Pattern banks — each array matches one logical column role
// ---------------------------------------------------------------------------

const IDENTIFIER_PATTERNS: RegExp[] = [
  /^login$/i,
  /^user$/i,
  /^username$/i,
  /^user[_\s-]?name$/i,
  /^email$/i,
  /^user[_\s-]?id$/i,
  /^member$/i,
  /^github[_\s-]?login$/i,
  /^assignee$/i,
];

const ACTIVITY_PATTERNS: RegExp[] = [
  /last[_\s-]?activity/i,
  /activity[_\s-]?date/i,
  /last[_\s-]?active/i,
  /last[_\s-]?used/i,
  /activity[_\s-]?at/i,
  /last[_\s-]?seen/i,
];

const AUTH_PATTERNS: RegExp[] = [
  /last[_\s-]?auth/i,
  /auth[_\s-]?date/i,
  /last[_\s-]?login/i,
  /last[_\s-]?sign[_\s-]?in/i,
  /authenticated[_\s-]?at/i,
];

const SURFACE_PATTERNS: RegExp[] = [
  /surface/i,
  /editor/i,
  /platform/i,
  /client/i,
  /last[_\s-]?surface/i,
  /copilot[_\s-]?editor/i,
];

const DEPARTMENT_PATTERNS: RegExp[] = [
  /^department$/i,
  /^team$/i,
  /^group$/i,
  /^org$/i,
  /^organization$/i,
  /^division$/i,
  /^unit$/i,
  /^squad$/i,
  /^business[_\s-]?unit$/i,
  /^cost[_\s-]?center$/i,
  /^dept$/i,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Given an array of CSV header strings, return a `ColumnMapping` whose fields
 * are set to the first header that matches the corresponding pattern bank.
 * Fields that cannot be auto-detected are left as `null`.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    identifier: null,
    lastActivity: null,
    lastAuthenticated: null,
    lastSurface: null,
    department: null,
  };

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().trim();

    if (!mapping.identifier && IDENTIFIER_PATTERNS.some((p) => p.test(normalizedHeader))) {
      mapping.identifier = header;
    }

    if (!mapping.lastActivity && ACTIVITY_PATTERNS.some((p) => p.test(normalizedHeader))) {
      mapping.lastActivity = header;
    }

    if (!mapping.lastAuthenticated && AUTH_PATTERNS.some((p) => p.test(normalizedHeader))) {
      mapping.lastAuthenticated = header;
    }

    if (!mapping.lastSurface && SURFACE_PATTERNS.some((p) => p.test(normalizedHeader))) {
      mapping.lastSurface = header;
    }

    if (!mapping.department && DEPARTMENT_PATTERNS.some((p) => p.test(normalizedHeader))) {
      mapping.department = header;
    }
  }

  return mapping;
}

/**
 * A mapping is considered "complete" when at least the two required columns
 * (identifier + lastActivity) have been resolved.
 */
export function isMappingComplete(mapping: ColumnMapping): boolean {
  return mapping.identifier !== null && mapping.lastActivity !== null;
}

/**
 * Return a 0-100 confidence score indicating how many of the expected columns
 * were successfully detected.
 *
 * Weights:
 *   identifier       — 40 points
 *   lastActivity     — 40 points
 *   lastAuthenticated — 10 points
 *   lastSurface      — 10 points
 */
export function getMappingConfidence(mapping: ColumnMapping): number {
  let score = 0;
  if (mapping.identifier) score += 40;
  if (mapping.lastActivity) score += 40;
  if (mapping.lastAuthenticated) score += 10;
  if (mapping.lastSurface) score += 10;
  return score;
}

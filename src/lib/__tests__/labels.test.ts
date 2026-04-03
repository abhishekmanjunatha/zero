import { describe, it, expect } from 'vitest'
import { formatLabel } from '@/lib/utils'
import {
  PURPOSE_LABELS,
  MODE_LABELS,
  STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  REPORT_TYPE_LABELS,
  GENDER_LABELS,
  ACTIVITY_LABELS,
  DIETARY_LABELS,
  WORK_LABELS,
  GOAL_LABELS,
  TIMELINE_EVENT_LABELS,
} from '@/lib/constants/labels'
import type {
  AppointmentPurpose,
  AppointmentMode,
  AppointmentStatus,
  DocumentType,
  ReportType,
  Gender,
  ActivityLevel,
  DietaryType,
  WorkType,
  PrimaryGoal,
  TimelineEventType,
} from '@/types/app'

// ── formatLabel utility ───────────────────────────────────────────────────────

describe('formatLabel', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatLabel('review_with_report')).toBe('Review With Report')
  })

  it('converts kebab-case to Title Case', () => {
    expect(formatLabel('follow-up')).toBe('Follow Up')
  })

  it('capitalises a single word', () => {
    expect(formatLabel('upcoming')).toBe('Upcoming')
  })

  it('handles multiple underscores', () => {
    expect(formatLabel('prefer_not_to_say')).toBe('Prefer Not To Say')
  })

  it('returns empty string for empty input', () => {
    expect(formatLabel('')).toBe('')
  })

  it('handles already formatted strings', () => {
    expect(formatLabel('Already Formatted')).toBe('Already Formatted')
  })
})

// ── Label map completeness ────────────────────────────────────────────────────
// These tests ensure every value of each union type has a corresponding label.
// If a new value is added to a type but not to the label map, TypeScript will
// catch it at compile time (Record<Type, string> enforces exhaustiveness).
// These runtime tests verify the labels are non-empty strings without underscores.

function assertLabelsAreUserFriendly(
  mapName: string,
  map: Record<string, string>
) {
  describe(`${mapName} labels are user-friendly`, () => {
    for (const [key, label] of Object.entries(map)) {
      it(`${mapName}["${key}"] = "${label}" is a clean label`, () => {
        expect(label.length).toBeGreaterThan(0)
        // Labels should not contain underscores (raw values leaking)
        expect(label).not.toMatch(/_/)
        // Multi-word labels must have capitalised first word
        expect(label[0]).toBe(label[0].toUpperCase())
      })
    }
  })
}

assertLabelsAreUserFriendly('PURPOSE_LABELS', PURPOSE_LABELS)
assertLabelsAreUserFriendly('MODE_LABELS', MODE_LABELS)
assertLabelsAreUserFriendly('STATUS_LABELS', STATUS_LABELS)
assertLabelsAreUserFriendly('DOCUMENT_TYPE_LABELS', DOCUMENT_TYPE_LABELS)
assertLabelsAreUserFriendly('REPORT_TYPE_LABELS', REPORT_TYPE_LABELS)
assertLabelsAreUserFriendly('GENDER_LABELS', GENDER_LABELS)
assertLabelsAreUserFriendly('ACTIVITY_LABELS', ACTIVITY_LABELS)
assertLabelsAreUserFriendly('DIETARY_LABELS', DIETARY_LABELS)
assertLabelsAreUserFriendly('WORK_LABELS', WORK_LABELS)
assertLabelsAreUserFriendly('GOAL_LABELS', GOAL_LABELS)
assertLabelsAreUserFriendly('TIMELINE_EVENT_LABELS', TIMELINE_EVENT_LABELS)

// ── Key count checks ──────────────────────────────────────────────────────────
// Ensures no labels are accidentally removed. Update counts when types change.

describe('label map key counts', () => {
  it('PURPOSE_LABELS has 4 entries', () => {
    expect(Object.keys(PURPOSE_LABELS)).toHaveLength(4)
  })
  it('MODE_LABELS has 2 entries', () => {
    expect(Object.keys(MODE_LABELS)).toHaveLength(2)
  })
  it('STATUS_LABELS has 6 entries', () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(6)
  })
  it('DOCUMENT_TYPE_LABELS has 4 entries', () => {
    expect(Object.keys(DOCUMENT_TYPE_LABELS)).toHaveLength(4)
  })
  it('REPORT_TYPE_LABELS has 5 entries', () => {
    expect(Object.keys(REPORT_TYPE_LABELS)).toHaveLength(5)
  })
  it('GENDER_LABELS has 4 entries', () => {
    expect(Object.keys(GENDER_LABELS)).toHaveLength(4)
  })
  it('ACTIVITY_LABELS has 3 entries', () => {
    expect(Object.keys(ACTIVITY_LABELS)).toHaveLength(3)
  })
  it('DIETARY_LABELS has 4 entries', () => {
    expect(Object.keys(DIETARY_LABELS)).toHaveLength(4)
  })
  it('WORK_LABELS has 3 entries', () => {
    expect(Object.keys(WORK_LABELS)).toHaveLength(3)
  })
  it('GOAL_LABELS has 4 entries', () => {
    expect(Object.keys(GOAL_LABELS)).toHaveLength(4)
  })
  it('TIMELINE_EVENT_LABELS has 11 entries', () => {
    expect(Object.keys(TIMELINE_EVENT_LABELS)).toHaveLength(11)
  })
})

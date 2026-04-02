import { describe, expect, it } from 'vitest'
import { defaultBlocksForType } from '@/components/clinical-notes/composer-helpers'

describe('defaultBlocksForType', () => {
  it('returns meal plan sections only for meal_plan', () => {
    const blocks = defaultBlocksForType('meal_plan')

    expect(blocks).toHaveLength(6)
    expect(blocks.map((b) => b.label)).toEqual([
      'Breakfast',
      'Mid-Morning Snack',
      'Lunch',
      'Evening Snack',
      'Dinner',
      'Instructions',
    ])
  })

  it('returns follow-up sections for follow_up_recommendation', () => {
    const blocks = defaultBlocksForType('follow_up_recommendation')

    expect(blocks).toHaveLength(3)
    expect(blocks.map((b) => b.label)).toEqual([
      'Progress Summary',
      'Recommendations',
      'Next Steps',
    ])
    expect(blocks.map((b) => b.label)).not.toContain('Breakfast')
  })

  it('returns one Notes block for quick_note', () => {
    const blocks = defaultBlocksForType('quick_note')

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.label).toBe('Notes')
    expect(blocks[0]?.type).toBe('custom')
  })

  it('returns one Content block for custom', () => {
    const blocks = defaultBlocksForType('custom')

    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.label).toBe('Content')
    expect(blocks[0]?.type).toBe('custom')
  })
})

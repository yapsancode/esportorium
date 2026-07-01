'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import type { PrizeBreakdownItem } from '@/lib/types'

export default function PrizeBreakdownEditor({
  items, onChange,
}: {
  items: PrizeBreakdownItem[]
  onChange: (items: PrizeBreakdownItem[]) => void
}) {
  function update(index: number, field: keyof PrizeBreakdownItem, value: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }
  function add() {
    onChange([...items, { placement: '', reward: '' }])
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="e.g. Champion"
            maxLength={50}
            value={item.placement}
            onChange={(e) => update(i, 'placement', e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="e.g. RM 5,000"
            maxLength={100}
            value={item.reward}
            onChange={(e) => update(i, 'reward', e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(i)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length < 15 && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add Placement
        </Button>
      )}
    </div>
  )
}

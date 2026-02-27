import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { addManualItem } from '../../lib/api'

interface QuickAddModalProps {
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

export default function QuickAddModal({ open, onClose, onAdded }: QuickAddModalProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [sourceName, setSourceName] = useState('LinkedIn - ')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = async () => {
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await addManualItem({
        title: title.trim(),
        url: url.trim(),
        content_raw: content.trim() || undefined,
        source_name: sourceName.trim() || 'Manual',
      })
      setTitle('')
      setUrl('')
      setContent('')
      setSourceName('LinkedIn - ')
      onAdded?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-[#1a1a1a]/50 z-40"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] bg-[#F5F3EF] border border-[#D1CCC4] rounded-sm shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D1CCC4]">
          <span className="font-heading text-base font-semibold text-[#1a1a1a]">
            Quick Add Item
          </span>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-[#555555]" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {error && (
            <div className="bg-[#B54A4A]/10 border border-[#B54A4A]/20 rounded-sm px-3 py-2">
              <span className="text-[12px] text-[#B54A4A]">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              TITLE *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter item title"
              className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              URL *
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              CONTENT
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste content here (will be summarized by AI)"
              className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888] h-24 resize-none"
            />
            <span className="text-[11px] text-[#888888]">
              Optional, will be summarized by AI
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              SOURCE NAME
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#D1CCC4]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-[#E8E4DC] px-4 py-2 rounded-sm"
          >
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              CANCEL
            </span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-[#C05A3C] px-4 py-2 rounded-sm disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F3EF]" />}
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
              ADD ITEM
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

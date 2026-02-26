import { X } from 'lucide-react'

interface QuickAddModalProps {
  open: boolean
  onClose: () => void
}

export default function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  if (!open) return null

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-[#1a1a1a]/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] bg-[#F5F3EF] border border-[#D1CCC4] rounded-sm shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D1CCC4]">
          <span className="font-heading text-base font-semibold text-[#1a1a1a]">
            Quick Add Item
          </span>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-[#555555]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              TITLE *
            </label>
            <input
              type="text"
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
              placeholder="https://..."
              className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none placeholder:text-[#888888]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              CONTENT
            </label>
            <textarea
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
              defaultValue="LinkedIn - "
              className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#D1CCC4]">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-[#E8E4DC] px-4 py-2 rounded-sm"
          >
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
              CANCEL
            </span>
          </button>
          <button className="flex items-center gap-2 bg-[#C05A3C] px-4 py-2 rounded-sm">
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
              ADD ITEM
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

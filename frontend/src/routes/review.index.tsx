import { createFileRoute } from '@tanstack/react-router'
import { Calendar, ClipboardCopy, Download, Loader2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { generateReview, getReviews, updateReview } from '../lib/api'
import type { WeeklyReview } from '../lib/types'

export const Route = createFileRoute('/review/')({
  component: ReviewPage,
})

function ReviewPage() {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [selectedReview, setSelectedReview] = useState<WeeklyReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Generate form state
  const today = new Date()
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const [weekStart, setWeekStart] = useState(monday.toISOString().split('T')[0])
  const [weekEnd, setWeekEnd] = useState(sunday.toISOString().split('T')[0])
  const [reviewTitle, setReviewTitle] = useState(`AI Intelligence Review: ${weekStart} to ${weekEnd}`)

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    try {
      const data = await getReviews()
      setReviews(data)
      if (data.length > 0 && !selectedReview) {
        setSelectedReview(data[0])
      }
    } catch (e) {
      console.error('Failed to load reviews:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const review = await generateReview({
        week_start: weekStart,
        week_end: weekEnd,
        title: reviewTitle,
      })
      setSelectedReview(review)
      await loadReviews()
    } catch (e) {
      console.error('Failed to generate review:', e)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (selectedReview) {
      navigator.clipboard.writeText(selectedReview.markdown)
    }
  }

  const handleDownload = () => {
    if (!selectedReview) return
    const blob = new Blob([selectedReview.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `review-${selectedReview.week_start}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Weekly Review" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-8 py-6">
          {/* Generate new review */}
          <div className="flex flex-col gap-4 border border-[#D1CCC4] rounded-sm p-5 bg-[#F5F3EF]">
            <div className="flex items-center justify-between">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#1a1a1a]">
                GENERATE NEW REVIEW
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  START DATE
                </span>
                <div className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-2 rounded-sm">
                  <Calendar className="w-3.5 h-3.5 text-[#555555]" />
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="bg-transparent text-sm text-[#1a1a1a] outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                  END DATE
                </span>
                <div className="flex items-center gap-2 bg-[#E8E4DC] px-3 py-2 rounded-sm">
                  <Calendar className="w-3.5 h-3.5 text-[#555555]" />
                  <input
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="bg-transparent text-sm text-[#1a1a1a] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
                REVIEW TITLE
              </span>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="bg-[#E8E4DC] px-3 py-2 rounded-sm text-sm text-[#1a1a1a] outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 bg-[#C05A3C] px-4 py-2 rounded-sm disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5F3EF]" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-[#F5F3EF]" />
                )}
                <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#F5F3EF]">
                  GENERATE REVIEW
                </span>
              </button>
            </div>
          </div>

          {/* Preview / Edit */}
          {selectedReview && (
            <div className="flex flex-col border border-[#D1CCC4] rounded-sm bg-white">
              <div className="flex items-center justify-between px-5 pt-4 pb-0">
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 text-[12px] font-heading font-medium rounded-t-sm ${
                      activeTab === 'preview'
                        ? 'bg-[#E8E4DC] text-[#1a1a1a]'
                        : 'text-[#888888]'
                    }`}
                  >
                    PREVIEW
                  </button>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1.5 text-[12px] font-heading font-medium rounded-t-sm ${
                      activeTab === 'edit'
                        ? 'bg-[#E8E4DC] text-[#1a1a1a]'
                        : 'text-[#888888]'
                    }`}
                  >
                    EDIT
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 bg-[#E8E4DC] px-3 py-1.5 rounded-sm"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5 text-[#555555]" />
                    <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                      COPY
                    </span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 bg-[#E8E4DC] px-3 py-1.5 rounded-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-[#555555]" />
                    <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                      DOWNLOAD .MD
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'preview' ? (
                  <div className="prose prose-sm max-w-none">
                    {selectedReview.markdown.split('\n').map((line, i) => {
                      if (line.startsWith('# '))
                        return (
                          <h1 key={i} className="text-2xl font-bold text-[#1a1a1a] mb-4 font-heading">
                            {line.replace('# ', '')}
                          </h1>
                        )
                      if (line.startsWith('## '))
                        return (
                          <h2 key={i} className="text-lg font-semibold text-[#1a1a1a] mt-6 mb-3 font-heading">
                            {line.replace('## ', '')}
                          </h2>
                        )
                      if (line.startsWith('### '))
                        return (
                          <h3 key={i} className="text-sm font-semibold mt-4 mb-2 flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: '#C05A3C' }}
                            />
                            {line.replace('### ', '')}
                          </h3>
                        )
                      if (line.startsWith('- [ ] '))
                        return (
                          <div key={i} className="flex items-center gap-2 ml-4 my-1">
                            <input type="checkbox" className="w-3.5 h-3.5" />
                            <span className="text-sm text-[#555555]">
                              {line.replace('- [ ] ', '')}
                            </span>
                          </div>
                        )
                      if (line.startsWith('- '))
                        return (
                          <p key={i} className="text-sm text-[#555555] ml-4 my-1">
                            &bull; {line.replace('- ', '')}
                          </p>
                        )
                      if (line.match(/^\d+\./))
                        return (
                          <p key={i} className="text-sm text-[#555555] ml-4 my-1">
                            {line}
                          </p>
                        )
                      if (line.trim() === '') return <div key={i} className="h-2" />
                      return (
                        <p key={i} className="text-sm text-[#555555] my-1">
                          {line}
                        </p>
                      )
                    })}
                  </div>
                ) : (
                  <textarea
                    className="w-full h-[500px] bg-[#E8E4DC] p-4 rounded-sm font-mono text-sm text-[#1a1a1a] outline-none resize-none"
                    defaultValue={selectedReview.markdown}
                    onBlur={async (e) => {
                      if (e.target.value !== selectedReview.markdown) {
                        try {
                          const updated = await updateReview(selectedReview.id, { markdown: e.target.value })
                          setSelectedReview(updated)
                        } catch (err) {
                          console.error('Failed to save review:', err)
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Past reviews */}
          <div className="flex flex-col gap-3">
            <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#888888]">
              PAST REVIEWS
            </span>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#888888]" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="flex flex-col border border-[#D1CCC4] rounded-sm">
                {reviews.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className={`flex items-center justify-between px-4 py-3 border-b border-[#D1CCC4] last:border-b-0 text-left ${
                      selectedReview?.id === review.id ? 'bg-[#E8E4DC]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[#1a1a1a]">
                        {review.week_start} to {review.week_end}
                      </span>
                      <span className="text-[12px] text-[#888888]">
                        {review.item_count} items
                      </span>
                      <span className="text-[12px] text-[#888888]">
                        Generated {new Date(review.generated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-heading text-[11px] font-semibold tracking-[1px] text-[#555555]">
                      VIEW
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#888888] py-4">
                No reviews yet. Star some items and generate your first review.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

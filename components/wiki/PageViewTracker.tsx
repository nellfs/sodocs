'use client'
import { useEffect } from 'react'
import { recordPageView } from '@/app/actions/pages'

export function PageViewTracker({ pageId }: { pageId: string }) {
  useEffect(() => {
    void recordPageView(pageId)
  }, [pageId])

  return null
}

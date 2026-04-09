import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200',
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <Skeleton className="h-8 w-1/5" />
        <Skeleton className="h-8 w-1/5" />
        <Skeleton className="h-8 w-1/5" />
        <Skeleton className="h-8 w-1/5" />
        <Skeleton className="h-8 w-1/5" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-1/5" />
          <Skeleton className="h-12 w-1/5" />
          <Skeleton className="h-12 w-1/5" />
          <Skeleton className="h-12 w-1/5" />
          <Skeleton className="h-12 w-1/5" />
        </div>
      ))}
    </div>
  )
}

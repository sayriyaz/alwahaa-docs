import Image from 'next/image'
import Link from 'next/link'
import alWahaaLogo from '@/Picture/alwahaa grp.png'

export default function AppBrandLink({
  compact = false,
  subtitle,
}: {
  compact?: boolean
  subtitle?: string
}) {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3">
      <div
        className={`relative overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm shadow-amber-100 transition-transform group-hover:-translate-y-0.5 ${
          compact ? 'h-11 w-11' : 'h-14 w-14'
        }`}
      >
        <Image
          src={alWahaaLogo}
          alt="Al Wahaa Group logo"
          fill
          sizes={compact ? '44px' : '56px'}
          className="object-contain p-1.5"
          priority={compact}
        />
      </div>
      <div className="min-w-0">
        <p
          className={`truncate uppercase text-amber-700 ${
            compact ? 'text-[0.65rem] tracking-[0.24em]' : 'text-xs tracking-[0.28em]'
          }`}
        >
          Al Wahaa Group
        </p>
        <p className={`truncate font-semibold tracking-tight text-slate-900 ${compact ? 'text-lg' : 'text-xl'}`}>
          Alwahaa Documents Clearing
        </p>
        {subtitle ? (
          <p className={`truncate text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>{subtitle}</p>
        ) : null}
      </div>
    </Link>
  )
}

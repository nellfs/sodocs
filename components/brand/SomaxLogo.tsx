import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SomaxLogoProps {
  variant?: 'icon' | 'wordmark'
  className?: string
  iconClassName?: string
}

export function SomaxLogo({
  variant = 'icon',
  className,
  iconClassName,
}: SomaxLogoProps) {
  if (variant === 'wordmark') {
    return (
      <Image
        src="/brand/somax-white.webp"
        alt="Somax"
        width={320}
        height={68}
        priority
        className={cn('h-6 w-auto', className)}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-[#0349fd]',
        className,
      )}
    >
      <Image
        src="/brand/logo-somax.png"
        alt="Somax"
        width={40}
        height={40}
        priority
        className={cn('h-6 w-6', iconClassName)}
      />
    </span>
  )
}

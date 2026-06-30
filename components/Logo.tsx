import Image from 'next/image'

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.png"
        alt="Body Rock"
        width={120}
        height={36}
        className="h-7 w-auto"
        priority
      />
    </div>
  )
}

import Image from 'next/image';

export function ClinicLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 40 : 44;
  const box = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11';
  return (
    <div className={`flex ${box} shrink-0 items-center justify-center`}>
      <Image src="/logo-64.png" alt="ClinicFlow" width={px} height={px} className="object-contain" priority />
    </div>
  );
}

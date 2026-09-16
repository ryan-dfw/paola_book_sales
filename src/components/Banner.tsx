import type { BannerState } from '../types';

interface BannerProps {
  banner: BannerState | null;
}

export function Banner({ banner }: BannerProps) {
  return (
    <div className={banner ? `banner ${banner.kind}` : 'banner'} hidden={!banner}>
      {banner?.message}
    </div>
  );
}

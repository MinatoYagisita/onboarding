type Props = {
  size?: number;
  className?: string;
};

// 新芽モチーフ。ライムグリーンの丸角背景に、白い双葉と茎。
export function LogoMark({ size = 28, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="var(--color-brand-500)" />
      {/* 茎 */}
      <path
        d="M16 23 L16 14"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* 左葉 */}
      <path
        d="M16 17 C13.2 17, 11 15.2, 10 12.4 C12.8 12.4, 15 14.2, 16 17 Z"
        fill="white"
      />
      {/* 右葉 */}
      <path
        d="M16 15 C18.8 15, 21 13.2, 22 10.4 C19.2 10.4, 17 12.2, 16 15 Z"
        fill="white"
      />
      {/* 地面のライン */}
      <path
        d="M10.5 24 L21.5 24"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

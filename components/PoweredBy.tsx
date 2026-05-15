// ブランド運営会社のクレジット表示。フロント・管理画面の両方に配置する。
// 画面の邪魔にならない薄いグレーで、控えめサイズに。

type Props = {
  variant?: "dark" | "light";
  className?: string;
};

export function PoweredBy({ variant = "light", className }: Props) {
  const textColor = variant === "dark" ? "text-gray-400" : "text-gray-400";
  return (
    <div
      className={`flex items-center justify-center gap-1.5 text-[10px] ${textColor} ${className ?? ""}`}
      aria-label="Powered by GrowDays"
    >
      <span>Powered by</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/growdays-logo.svg"
        alt="GrowDays"
        width={64}
        height={16}
        style={{ height: 16, width: "auto", opacity: 0.7 }}
      />
    </div>
  );
}

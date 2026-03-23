import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Position, type HandleProps } from "@xyflow/react";
import { BaseHandle } from "@/components/base-handle";

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    "flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2",
  [Position.Bottom]: "flex-col left-1/2 translate-y-[10px] -translate-x-1/2",
  [Position.Left]:
    "flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2",
  [Position.Right]: "top-1/2 -translate-y-1/2 translate-x-[10px]",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function ButtonHandle({
  showButton = false,
  visible,
  position = Position.Bottom,
  followAreaSize = 96,
  buttonSize = 28,
  children,
  ...props
}: HandleProps & {
  showButton?: boolean;
    visible?: boolean;
  followAreaSize?: number;
  buttonSize?: number;
}) {
  const shouldShow = visible ?? showButton;
  const wrapperClassName = wrapperClassNames[position || Position.Bottom];
  const vertical = position === Position.Top || position === Position.Bottom;
  const followAreaRef = useRef<HTMLDivElement | null>(null);

  // 用 CSS 变量更新按钮位置，避免 React state 带来的重渲染。
  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const area = event.currentTarget;
      const rect = area.getBoundingClientRect();
      const halfButton = buttonSize / 2;

      const centerX = clamp(
        event.clientX - rect.left,
        halfButton,
        followAreaSize - halfButton,
      );
      const centerY = clamp(
        event.clientY - rect.top,
        halfButton,
        followAreaSize - halfButton,
      );

      area.style.setProperty("--btn-x", `${centerX}px`);
      area.style.setProperty("--btn-y", `${centerY}px`);
    },
    [buttonSize, followAreaSize],
  );

  // 鼠标离开区域后清除变量，按钮回到默认中心（50%/50%）。
  const handlePointerLeave = useCallback(() => {
    const area = followAreaRef.current;
    if (area) {
      area.style.removeProperty("--btn-x");
      area.style.removeProperty("--btn-y");
    }
  }, []);

  return (
    <BaseHandle position={position} id={props.id} {...props}>
      {shouldShow && (
        <div
          className={`absolute flex items-center ${wrapperClassName} pointer-events-none`}
        >
          <div
            className={`bg-gray-300 ${vertical ? "h-10 w-px" : "h-px w-10"}`}
          />
          <div
            ref={followAreaRef}
            className="relative nodrag nopan pointer-events-auto rounded-md border border-pink-300/80 bg-pink-200/45"
            style={{
              width: followAreaSize,
              height: followAreaSize,
            }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: buttonSize,
                height: buttonSize,
                left: "var(--btn-x, 50%)",
                top: "var(--btn-y, 50%)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="nodrag nopan pointer-events-auto">
                {children ?? (
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-600 shadow-sm">
                    +
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseHandle>
  );
}

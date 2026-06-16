import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 10, step = 1, value, onChange, label, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>{label}</span>
            <span className="text-indigo-400 font-bold text-sm bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">{value}</span>
          </div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className={cn(
            "w-full h-1.5 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="flex justify-between text-[10px] font-bold text-slate-500 px-0.5">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

"use client";

import { useEffect, useRef } from "react";
import { Textarea } from "./textarea";

export type AutoResizeTextareaProps = React.ComponentProps<typeof Textarea>;

export function AutoResizeTextarea({
  className,
  value,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <Textarea
      {...props}
      value={value}
      ref={textareaRef}
      className={className}
      rows={1}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
    />
  );
}

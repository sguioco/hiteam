"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadProps = {
  accept?: string;
  buttonLabel?: string;
  className?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  multiple?: boolean;
  onFilesChange: (files: File[]) => void;
  title: string;
  visual?: React.ReactNode;
};

export default function Upload({
  accept,
  buttonLabel,
  className,
  description,
  disabled = false,
  id,
  multiple = false,
  onFilesChange,
  title,
  visual,
}: UploadProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFilesChange(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  return (
    <label
      className={cn(
        "upload-field",
        visual ? "upload-field--media" : null,
        className,
      )}
      htmlFor={inputId}
    >
      <input
        accept={accept}
        className="upload-field__input"
        disabled={disabled}
        id={inputId}
        multiple={multiple}
        onChange={handleChange}
        type="file"
      />
      {visual ? <span className="upload-field__visual">{visual}</span> : null}
      {buttonLabel ? (
        <span className="upload-field__button">
          <UploadCloud className="size-4" />
          {buttonLabel}
        </span>
      ) : null}
      {title || description ? (
        <span className="upload-field__copy">
          {title ? <strong>{title}</strong> : null}
          {description ? <small>{description}</small> : null}
        </span>
      ) : null}
    </label>
  );
}

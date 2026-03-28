"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImageAdjustFieldProps = {
  value?: string | null;
  onChange: (nextValue: string | null) => void;
  onError?: (message: string | null) => void;
  onSourceReady?: (payload: {
    dataUrl: string;
    fileName: string;
    height: number;
    width: number;
  }) => void;
  renderTrigger: (props: {
    chooseFile: () => void;
    fileName: string;
    hasValue: boolean;
    openEditor: () => void;
    previewSrc: string | null;
  }) => ReactNode;
  previewAlt: string;
  dialogTitle: string;
  dialogDescription: string;
  applyLabel?: string;
  cancelLabel?: string;
  zoomLabel?: string;
  offsetXLabel?: string;
  offsetYLabel?: string;
  sourceMaxSide?: number;
  sourceQuality?: number;
  outputSize?: number;
  outputHeight?: number;
  outputQuality?: number;
  outputWidth?: number;
  viewportAspectRatio?: number;
  viewportSize?: number;
};

async function compressImageToDataUrl(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<{ dataUrl: string; height: number; width: number }> {
  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Не удалось обработать изображение."));
    nextImage.src = sourceDataUrl;
  });

  const maxSide = options?.maxSide ?? 960;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Не удалось подготовить изображение.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const compressed = canvas.toDataURL("image/jpeg", options?.quality ?? 0.82);
  if (compressed.length > 7_000_000) {
    throw new Error("Фото слишком большое. Выбери изображение поменьше.");
  }

  return {
    dataUrl: compressed,
    height,
    width,
  };
}

function getViewportDimensions(viewportSize: number, aspectRatio: number) {
  if (aspectRatio >= 1) {
    return {
      height: Math.round(viewportSize / aspectRatio),
      width: viewportSize,
    };
  }

  return {
    height: viewportSize,
    width: Math.round(viewportSize * aspectRatio),
  };
}

function getOutputDimensions(options: {
  aspectRatio: number;
  outputHeight?: number;
  outputSize: number;
  outputWidth?: number;
}) {
  if (options.outputWidth && options.outputHeight) {
    return {
      height: options.outputHeight,
      width: options.outputWidth,
    };
  }

  if (options.aspectRatio >= 1) {
    return {
      height: Math.max(1, Math.round(options.outputSize / options.aspectRatio)),
      width: options.outputSize,
    };
  }

  return {
    height: options.outputSize,
    width: Math.max(1, Math.round(options.outputSize * options.aspectRatio)),
  };
}

async function renderAdjustedImagePreviewDataUrl(
  sourceDataUrl: string,
  options: {
    canvasHeight: number;
    canvasWidth: number;
    offsetX: number;
    offsetY: number;
    quality?: number;
    viewportHeight: number;
    viewportWidth: number;
    zoom: number;
  },
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Не удалось обработать изображение."));
    nextImage.src = sourceDataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = options.canvasWidth;
  canvas.height = options.canvasHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Не удалось подготовить превью.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, options.canvasWidth, options.canvasHeight);

  const coverScale =
    Math.max(options.canvasWidth / image.width, options.canvasHeight / image.height) * options.zoom;
  const drawWidth = image.width * coverScale;
  const drawHeight = image.height * coverScale;
  const translateFactorX = options.canvasWidth / options.viewportWidth;
  const translateFactorY = options.canvasHeight / options.viewportHeight;
  const drawX = (options.canvasWidth - drawWidth) / 2 + options.offsetX * translateFactorX;
  const drawY = (options.canvasHeight - drawHeight) / 2 + options.offsetY * translateFactorY;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return canvas.toDataURL("image/jpeg", options.quality ?? 0.82);
}

export function ImageAdjustField({
  value = null,
  onChange,
  onError,
  onSourceReady,
  renderTrigger,
  previewAlt,
  dialogTitle,
  dialogDescription,
  applyLabel = "Применить",
  cancelLabel = "Отмена",
  zoomLabel = "Масштаб",
  offsetXLabel = "Сдвиг по X",
  offsetYLabel = "Сдвиг по Y",
  sourceMaxSide = 420,
  sourceQuality = 0.78,
  outputSize = 300,
  outputHeight,
  outputQuality = 0.82,
  outputWidth,
  viewportAspectRatio = 1,
  viewportSize = 360,
}: ImageAdjustFieldProps) {
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(value);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(value);
  const [editorOpen, setEditorOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPendingOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);
  const editorValuesRef = useRef({ zoom: 1, offsetX: 0, offsetY: 0 });
  const editorImageRef = useRef<HTMLImageElement | null>(null);
  const zoomRangeRef = useRef<HTMLInputElement | null>(null);
  const offsetXRangeRef = useRef<HTMLInputElement | null>(null);
  const offsetYRangeRef = useRef<HTMLInputElement | null>(null);
  const viewportFrame = getViewportDimensions(viewportSize, viewportAspectRatio);
  const outputFrame = getOutputDimensions({
    aspectRatio: viewportAspectRatio,
    outputHeight,
    outputSize,
    outputWidth,
  });

  useEffect(() => {
    setPreviewDataUrl(value);
    setSourceDataUrl(value);
  }, [value]);

  function applyTransform() {
    const image = editorImageRef.current;
    if (!image) return;

    const { zoom, offsetX, offsetY } = editorValuesRef.current;
    image.style.transform = `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0) scale(${zoom})`;
  }

  function scheduleTransform() {
    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      applyTransform();
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const prepared = await compressImageToDataUrl(file, {
        maxSide: sourceMaxSide,
        quality: sourceQuality,
      });
      setPreviewDataUrl(prepared.dataUrl);
      setSourceDataUrl(prepared.dataUrl);
      setFileName(file.name);
      editorValuesRef.current = { zoom: 1, offsetX: 0, offsetY: 0 };
      dragPendingOffsetRef.current = { x: 0, y: 0 };
      setEditorOpen(true);
      onSourceReady?.({
        dataUrl: prepared.dataUrl,
        fileName: file.name,
        height: prepared.height,
        width: prepared.width,
      });
      onError?.(null);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Не удалось подготовить изображение.",
      );
    }
  }

  async function handleApply() {
    if (!sourceDataUrl) return;

    try {
      const nextPreview = await renderAdjustedImagePreviewDataUrl(sourceDataUrl, {
        canvasHeight: outputFrame.height,
        canvasWidth: outputFrame.width,
        zoom: editorValuesRef.current.zoom,
        offsetX: editorValuesRef.current.offsetX,
        offsetY: editorValuesRef.current.offsetY,
        quality: outputQuality,
        viewportHeight: viewportFrame.height,
        viewportWidth: viewportFrame.width,
      });
      setPreviewDataUrl(nextPreview);
      onChange(nextPreview);
      setEditorOpen(false);
      onError?.(null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Не удалось применить превью.");
    }
  }

  function chooseFile() {
    inputRef.current?.click();
  }

  function openEditor() {
    if (!previewDataUrl && !sourceDataUrl) {
      chooseFile();
      return;
    }

    if (!sourceDataUrl && previewDataUrl) {
      setSourceDataUrl(previewDataUrl);
    }
    setEditorOpen(true);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!sourceDataUrl) return;
    dragPointerIdRef.current = event.pointerId;
    dragStartPointRef.current = { x: event.clientX, y: event.clientY };
    dragStartOffsetRef.current = {
      x: editorValuesRef.current.offsetX,
      y: editorValuesRef.current.offsetY,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId || !dragStartPointRef.current) {
      return;
    }

    const deltaX = event.clientX - dragStartPointRef.current.x;
    const deltaY = event.clientY - dragStartPointRef.current.y;
    dragPendingOffsetRef.current = {
      x: Math.round(dragStartOffsetRef.current.x + deltaX),
      y: Math.round(dragStartOffsetRef.current.y + deltaY),
    };
    editorValuesRef.current.offsetX = dragPendingOffsetRef.current.x;
    editorValuesRef.current.offsetY = dragPendingOffsetRef.current.y;
    if (offsetXRangeRef.current) {
      offsetXRangeRef.current.value = String(dragPendingOffsetRef.current.x);
    }
    if (offsetYRangeRef.current) {
      offsetYRangeRef.current.value = String(dragPendingOffsetRef.current.y);
    }
    scheduleTransform();
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }

    dragPointerIdRef.current = null;
    dragStartPointRef.current = null;
    setDragging(false);

    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
      editorValuesRef.current.offsetX = dragPendingOffsetRef.current.x;
      editorValuesRef.current.offsetY = dragPendingOffsetRef.current.y;
      applyTransform();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  useEffect(() => {
    if (!editorOpen) return;

    const { zoom, offsetX, offsetY } = editorValuesRef.current;
    if (zoomRangeRef.current) zoomRangeRef.current.value = String(zoom);
    if (offsetXRangeRef.current) offsetXRangeRef.current.value = String(offsetX);
    if (offsetYRangeRef.current) offsetYRangeRef.current.value = String(offsetY);
    applyTransform();
  }, [editorOpen, sourceDataUrl]);

  return (
    <>
      <input
        ref={inputRef}
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        type="file"
      />

      {renderTrigger({
        chooseFile,
        fileName,
        hasValue: Boolean(previewDataUrl),
        openEditor,
        previewSrc: previewDataUrl,
      })}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[min(760px,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
          <div className="border-b border-[color:var(--border)] px-6 py-4">
            <DialogHeader className="gap-1">
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="mx-auto flex w-full max-w-[420px] items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,#f6f8fc_0%,#edf2f9_100%)] p-4">
              <div
                className="relative overflow-hidden rounded-[28px] border-2 border-[#3b82f6] bg-white shadow-inner"
                onPointerCancel={handlePointerEnd}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                style={{
                  cursor: sourceDataUrl ? (dragging ? "grabbing" : "grab") : "default",
                  height: viewportFrame.height,
                  width: viewportFrame.width,
                }}
              >
                {sourceDataUrl ? (
                  <img
                    alt={previewAlt}
                    ref={editorImageRef}
                    className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
                    draggable={false}
                    src={sourceDataUrl}
                    style={{
                      transform: `translate3d(calc(-50% + ${editorValuesRef.current.offsetX}px), calc(-50% + ${editorValuesRef.current.offsetY}px), 0) scale(${editorValuesRef.current.zoom})`,
                      transformOrigin: "center center",
                      userSelect: "none",
                      willChange: "transform",
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex min-w-[190px] flex-1 items-center gap-3 text-sm">
                <span className="inline-flex shrink-0 items-center gap-2 font-medium whitespace-nowrap">
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                  {zoomLabel}
                </span>
                <input
                  ref={zoomRangeRef}
                  className="min-w-0 flex-1"
                  defaultValue="1"
                  max="2.6"
                  min="1"
                  onInput={(event) => {
                    editorValuesRef.current.zoom = Number(event.currentTarget.value);
                    scheduleTransform();
                  }}
                  step="0.01"
                  type="range"
                />
              </label>

              <label className="flex min-w-[190px] flex-1 items-center gap-3 text-sm">
                <span className="shrink-0 font-medium whitespace-nowrap">{offsetXLabel}</span>
                <input
                  ref={offsetXRangeRef}
                  className="min-w-0 flex-1"
                  defaultValue="0"
                  max="160"
                  min="-160"
                  onInput={(event) => {
                    editorValuesRef.current.offsetX = Number(event.currentTarget.value);
                    scheduleTransform();
                  }}
                  step="1"
                  type="range"
                />
              </label>

              <label className="flex min-w-[190px] flex-1 items-center gap-3 text-sm">
                <span className="shrink-0 font-medium whitespace-nowrap">{offsetYLabel}</span>
                <input
                  ref={offsetYRangeRef}
                  className="min-w-0 flex-1"
                  defaultValue="0"
                  max="160"
                  min="-160"
                  onInput={(event) => {
                    editorValuesRef.current.offsetY = Number(event.currentTarget.value);
                    scheduleTransform();
                  }}
                  step="1"
                  type="range"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-[color:var(--border)] px-6 py-4 sm:justify-between">
            <Button onClick={() => setEditorOpen(false)} type="button" variant="outline">
              {cancelLabel}
            </Button>
            <Button onClick={() => void handleApply()} type="button">
              {applyLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

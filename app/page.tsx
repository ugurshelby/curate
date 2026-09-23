"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CurateImage,
  AspectRatio,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
  ExportPreset,
  ExportProgress,
} from "@/lib/types";
import { Header } from "@/components/Header";
import { ViewportCanvas } from "@/components/ViewportCanvas";
import { DumpFilmstrip } from "@/components/DumpFilmstrip";
import { DumpGalleryView } from "@/components/DumpGalleryView";
import { ControlToolbar } from "@/components/ControlToolbar";
import { ProcessingModal } from "@/components/ProcessingModal";
import { ExportModal } from "@/components/ExportModal";
import { SAMPLE_IMAGES, generateOfflineSample } from "@/lib/sample-images";
import {
  exportSingleImage,
  exportDumpZip,
  downloadBlob,
  EXPORT_PRESETS,
} from "@/lib/export/zip-exporter";
import { Upload, Sparkles } from "lucide-react";

export default function CurateStudioPage() {
  const [images, setImages] = useState<CurateImage[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [referenceImageId, setReferenceImageId] = useState<string | null>(null);

  // Viewport guides, simulator overlay & live before/after compare
  const [guide, setGuide] = useState<CompositionGuide>("none");
  const [overlay, setOverlay] = useState<SocialOverlayType>("none");
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Export & Progress state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    current: 0,
    total: 0,
    phase: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active image object
  const activeImage = images.find((img) => img.id === activeImageId) || null;
  const referenceImage = images.find((img) => img.id === referenceImageId) || null;

  // Helper to construct a CurateImage from file/URL
  const createCurateImage = (
    id: string,
    name: string,
    dataUrl: string,
    width: number,
    height: number
  ): CurateImage => ({
    id,
    name,
    dataUrl,
    originalWidth: width,
    originalHeight: height,
    aspectRatio: width / height,
    crop: {
      aspectRatio: "4:5",
      zoom: 1.0,
      panX: 0,
      panY: 0,
    },
    filters: {
      reinhardEnabled: false,
      reinhardStrength: 65,
      referenceImageId: null,
      grainEnabled: false,
      grainAmount: 25,
      grainSize: 1,
      halationEnabled: false,
      halationRadius: 10,
      halationTemp: 60,
      halationThreshold: 0.82,
    },
  });

  // Handle file uploads
  const handleUploadFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validImageFiles = fileArray.filter((f) => f.type.startsWith("image/"));

    validImageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newImg = createCurateImage(
            `img_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
            file.name,
            dataUrl,
            img.naturalWidth,
            img.naturalHeight
          );

          setImages((prev) => {
            const next = [...prev, newImg];
            if (prev.length === 0) {
              setActiveImageId(newImg.id);
            }
            return next;
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Load high quality sample photo collection with offline-safe fallback
  const handleLoadSamples = useCallback(async () => {
    const loaded: CurateImage[] = [];

    for (let i = 0; i < SAMPLE_IMAGES.length; i++) {
      const sample = SAMPLE_IMAGES[i];
      let loadedSuccessfully = false;

      try {
        const res = await fetch(sample.url, { mode: "cors" });
        if (res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();

          await new Promise<void>((resolve) => {
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              const img = new Image();
              img.onload = () => {
                const item = createCurateImage(
                  `sample_${i}_${Date.now()}`,
                  sample.name,
                  dataUrl,
                  img.naturalWidth,
                  img.naturalHeight
                );
                loaded.push(item);
                loadedSuccessfully = true;
                resolve();
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        // Fallback to offline procedural generator
      }

      if (!loadedSuccessfully) {
        const offlineSample = generateOfflineSample(i);
        const item = createCurateImage(
          `sample_${i}_${Date.now()}`,
          offlineSample.name,
          offlineSample.dataUrl,
          offlineSample.width,
          offlineSample.height
        );
        loaded.push(item);
      }
    }

    if (loaded.length > 0) {
      setImages(loaded);
      setActiveImageId(loaded[0].id);
      if (loaded.length > 1) {
        setReferenceImageId(loaded[1].id);
      }
    }
  }, []);

  // Drag and drop anywhere in window
  const handleWindowDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUploadFiles(e.dataTransfer.files);
      }
    },
    [handleUploadFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Filmstrip reordering
  const handleReorder = (sourceIndex: number, destIndex: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(sourceIndex, 1);
      next.splice(destIndex, 0, removed);
      return next;
    });
  };

  // Delete image
  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      if (activeImageId === id) {
        setActiveImageId(next.length > 0 ? next[0].id : null);
      }
      if (referenceImageId === id) {
        setReferenceImageId(null);
      }
      return next;
    });
  };

  // Set reference image for Reinhard Color Transfer
  const handleSetReference = (id: string) => {
    setReferenceImageId((prev) => {
      const nextRefId = prev === id ? null : id;
      if (activeImageId) {
        setImages((imgs) =>
          imgs.map((img) =>
            img.id === activeImageId
              ? {
                  ...img,
                  filters: {
                    ...img.filters,
                    referenceImageId: nextRefId,
                    reinhardEnabled: nextRefId !== null ? true : img.filters.reinhardEnabled,
                  },
                }
              : img
          )
        );
      }
      return nextRefId;
    });
  };

  // Update crop for active image
  const handleUpdateCrop = (panX: number, panY: number, zoom: number) => {
    if (!activeImageId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              crop: {
                ...img.crop,
                panX,
                panY,
                zoom,
              },
            }
          : img
      )
    );
  };

  // Update aspect ratio for active image
  const handleUpdateCropRatio = (aspectRatio: AspectRatio) => {
    if (!activeImageId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              crop: {
                ...img.crop,
                aspectRatio,
              },
            }
          : img
      )
    );
  };

  // Update filters for active image
  const handleUpdateFilters = (newFilters: Partial<CurateImage["filters"]>) => {
    if (!activeImageId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              filters: {
                ...img.filters,
                ...newFilters,
                referenceImageId:
                  newFilters.referenceImageId !== undefined
                    ? newFilters.referenceImageId
                    : referenceImageId,
              },
            }
          : img
      )
    );
  };

  // Reset filters for active image
  const handleResetFilters = () => {
    if (!activeImageId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              filters: {
                reinhardEnabled: false,
                reinhardStrength: 65,
                referenceImageId: null,
                grainEnabled: false,
                grainAmount: 25,
                grainSize: 1,
                halationEnabled: false,
                halationRadius: 10,
                halationTemp: 60,
                halationThreshold: 0.82,
              },
            }
          : img
      )
    );
  };

  // Export single image
  const handleExportSingle = async (preset: ExportPreset) => {
    if (!activeImage) return;

    try {
      setExportProgress({
        isExporting: true,
        current: 1,
        total: 1,
        phase: `İşleniyor: ${activeImage.name} (${preset.name})`,
      });

      const blob = await exportSingleImage(activeImage, referenceImage, preset);
      const cleanName = activeImage.name.replace(/\.[^/.]+$/, "");
      downloadBlob(blob, `curate_${cleanName}_${preset.id}.jpg`);
    } catch (err) {
      console.error("Export error:", err);
      alert("Dışa aktarma sırasında bir hata oluştu.");
    } finally {
      setExportProgress({ isExporting: false, current: 0, total: 0, phase: "" });
    }
  };

  // Export entire dump series to zip
  const handleExportDump = async (preset: ExportPreset = EXPORT_PRESETS[0]) => {
    if (images.length === 0) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      const zipBlob = await exportDumpZip(images, preset, (p) => {
        setExportProgress(p);
      });

      downloadBlob(zipBlob, `dump_${today}.zip`);
    } catch (err) {
      console.error("Dump export error:", err);
      alert("Toplu arşiv oluşturulurken bir hata oluştu.");
    } finally {
      setExportProgress({ isExporting: false, current: 0, total: 0, phase: "" });
    }
  };

  // Apple keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowRight" && images.length > 0 && activeImageId) {
        const curIdx = images.findIndex((img) => img.id === activeImageId);
        if (curIdx < images.length - 1) {
          setActiveImageId(images[curIdx + 1].id);
        }
      } else if (e.key === "ArrowLeft" && images.length > 0 && activeImageId) {
        const curIdx = images.findIndex((img) => img.id === activeImageId);
        if (curIdx > 0) {
          setActiveImageId(images[curIdx - 1].id);
        }
      } else if (e.code === "Space" && activeImageId) {
        e.preventDefault();
        setShowOriginal(true);
      } else if (e.key === "Escape") {
        if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (activeImageId) {
          setActiveImageId(null); // Exit edit mode back to gallery!
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setShowOriginal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [images, activeImageId, isExportModalOpen]);

  return (
    <main
      className="h-screen w-screen flex flex-col bg-black text-neutral-100 overflow-hidden relative"
      onDrop={handleWindowDrop}
      onDragOver={handleDragOver}
    >
      {/* Top Header */}
      <Header
        images={images}
        activeImageId={activeImageId}
        referenceImageId={referenceImageId}
        onUpload={handleUploadFiles}
        onLoadSamples={handleLoadSamples}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onExitEdit={() => setActiveImageId(null)}
      />

      {/* Main Viewport / Gallery Area */}
      <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
        {images.length === 0 ? (
          /* State 1: Empty Welcome Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="w-20 h-20 rounded-3xl bg-neutral-900/60 border border-white/10 flex items-center justify-center shadow-glass mb-6">
              <Upload className="w-9 h-9 text-neutral-300 stroke-[1.5]" />
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-white mb-2">
              Curate Studio&apos;ya Hoş Geldiniz
            </h1>
            <p className="text-xs text-neutral-400 max-w-sm mb-6 leading-relaxed">
              Fotoğraflarınızı buraya sürükleyip bırakın veya örnek fotoğraf serisi ile hemen
              denemeye başlayın. Tüm işlemler kayıpsız ve tarayıcınızda gerçekleşir.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadSamples}
                className="pressable px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-medium text-white flex items-center gap-2 transition-all shadow-glass-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Örnek Seriyi Yükle</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="pressable px-4 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-glass-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Fotoğraf Seç</span>
              </button>
            </div>
          </div>
        ) : activeImageId === null ? (
          /* State 2: Dump Overview Gallery View (When not editing a specific photo) */
          <DumpGalleryView
            images={images}
            referenceImageId={referenceImageId}
            onSelectImage={setActiveImageId}
            onSetReference={handleSetReference}
            onDeleteImage={handleDeleteImage}
            onUploadClick={() => fileInputRef.current?.click()}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        ) : (
          /* State 3: Active Photo Edit Studio */
          <>
            <ViewportCanvas
              image={activeImage}
              referenceImage={referenceImage}
              guide={guide}
              overlay={overlay}
              showOriginal={showOriginal}
              onUpdateCrop={handleUpdateCrop}
            />

            {/* Draggable & Collapsible Control Toolbar */}
            <ControlToolbar
              image={activeImage}
              images={images}
              referenceImageId={referenceImageId}
              activeGuide={guide}
              activeOverlay={overlay}
              showOriginal={showOriginal}
              onUpdateCropRatio={handleUpdateCropRatio}
              onUpdateZoom={(z) =>
                activeImage &&
                handleUpdateCrop(activeImage.crop.panX, activeImage.crop.panY, z)
              }
              onUpdateGuide={setGuide}
              onUpdateOverlay={setOverlay}
              onUpdateFilters={handleUpdateFilters}
              onResetFilters={handleResetFilters}
              onSetShowOriginal={setShowOriginal}
              onExportSingle={handleExportSingle}
              onExportDump={() => setIsExportModalOpen(true)}
              onExitEdit={() => setActiveImageId(null)}
            />
          </>
        )}
      </div>

      {/* Hidden file input for adding cards */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* Bottom Horizontal Filmstrip (Only visible during active editing) */}
      {images.length > 0 && activeImageId !== null && (
        <DumpFilmstrip
          images={images}
          activeImageId={activeImageId}
          referenceImageId={referenceImageId}
          onSelectImage={setActiveImageId}
          onSetReference={handleSetReference}
          onDeleteImage={handleDeleteImage}
          onReorder={handleReorder}
          onUploadClick={() => fileInputRef.current?.click()}
        />
      )}

      {/* Export Selection Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        images={images}
        activeImage={activeImage}
        onExportDump={handleExportDump}
        onExportSingle={handleExportSingle}
      />

      {/* Processing & Progress Modal */}
      <ProcessingModal progress={exportProgress} />
    </main>
  );
}

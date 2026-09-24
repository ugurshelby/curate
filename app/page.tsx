"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CurateImage,
  AspectRatio,
  CompositionGuide,
  SocialOverlay as SocialOverlayType,
  ExportPreset,
  ExportProgress,
  UpscaleMultiplier,
  BorderState,
  TimestampState,
  PanoramaSlice,
  FocusCategory,
  AestheticPreset,
  FilmPreset,
} from "@/lib/types";
import { Header } from "@/components/Header";
import { ViewportCanvas } from "@/components/ViewportCanvas";
import { SplitViewPreview } from "@/components/SplitViewPreview";
import { DumpFilmstrip } from "@/components/DumpFilmstrip";
import { DumpGalleryView } from "@/components/DumpGalleryView";
import { ControlToolbar } from "@/components/ControlToolbar";
import { EditStagePills } from "@/components/EditStagePills";
import { CanvasQuickControls } from "@/components/CanvasQuickControls";
import { MobileStudioSheet } from "@/components/MobileStudioSheet";
import { ProcessingModal } from "@/components/ProcessingModal";
import { ExportModal } from "@/components/ExportModal";
import { PanoramaSplitterModal } from "@/components/PanoramaSplitterModal";
import { StoryCollageModal } from "@/components/StoryCollageModal";
import { SAMPLE_IMAGES, generateOfflineSample } from "@/lib/sample-images";
import {
  createDefaultFilters,
  createDefaultCrop,
  createDefaultBorder,
  createDefaultTimestamp,
} from "@/lib/image/defaults";
import {
  exportSingleImage,
  exportDumpZip,
  downloadBlob,
  EXPORT_PRESETS,
} from "@/lib/export/zip-exporter";
import {
  createTrackedObjectURL,
  revokeObjectURL,
  revokeAllTrackedURLs,
} from "@/lib/url-lifecycle";
import { EditHistory } from "@/lib/history";
import {
  loadAestheticPresets,
  createAestheticPreset,
  upsertAestheticPreset,
  saveOrUpdateAestheticPreset,
  deleteAestheticPreset,
  applyAestheticToSeries,
} from "@/lib/aesthetic-presets";
import { applySignaturePresetToFilterState } from "@/lib/image/film-presets";
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
  const [isPanoramaModalOpen, setIsPanoramaModalOpen] = useState(false);
  const [isCollageModalOpen, setIsCollageModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    isExporting: false,
    current: 0,
    total: 0,
    phase: "",
  });

  // Progressive disclosure: Stage 2 pills / Stage 3 focus
  const [focusCategory, setFocusCategory] = useState<FocusCategory>(null);
  const [splitView, setSplitView] = useState(false);
  const [splitPeerId, setSplitPeerId] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [aestheticPresets, setAestheticPresets] = useState<AestheticPreset[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef(new EditHistory());
  const isApplyingHistoryRef = useRef(false);
  const filterHistoryArmedRef = useRef(false);
  const cropGesturePreRef = useRef<{
    images: CurateImage[];
    activeImageId: string | null;
    referenceImageId: string | null;
  } | null>(null);
  const cropGestureCommittedRef = useRef(false);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // Active image object
  const activeImage = images.find((img) => img.id === activeImageId) || null;
  const referenceImage = images.find((img) => img.id === referenceImageId) || null;

  useEffect(() => {
    setAestheticPresets(loadAestheticPresets());
    return () => {
      revokeAllTrackedURLs();
    };
  }, []);

  const pushHistory = useCallback(() => {
    if (isApplyingHistoryRef.current) return;
    historyRef.current.push({
      images: imagesRef.current,
      activeImageId,
      referenceImageId,
    });
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, [activeImageId, referenceImageId]);

  // Helper to construct a CurateImage from file/URL
  const createCurateImage = (
    id: string,
    name: string,
    dataUrl: string,
    width: number,
    height: number,
    ownsObjectURL = false
  ): CurateImage => ({
    id,
    name,
    dataUrl,
    ownsObjectURL,
    originalWidth: width,
    originalHeight: height,
    aspectRatio: width / height,
    crop: createDefaultCrop(),
    filters: createDefaultFilters(),
    border: createDefaultBorder(),
    timestamp: createDefaultTimestamp(),
    upscaleFactor: 1,
  });

  // Handle file uploads — blob: URLs (revoked on delete) to avoid multi-4K dataURL leaks
  const handleUploadFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validImageFiles = fileArray.filter((f) => f.type.startsWith("image/"));

    pushHistory();

    validImageFiles.forEach((file, index) => {
      const objectUrl = createTrackedObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const newImg = createCurateImage(
          `img_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
          file.name,
          objectUrl,
          img.naturalWidth,
          img.naturalHeight,
          true
        );

        setImages((prev) => {
          const next = [...prev, newImg];
          if (prev.length === 0) {
            setActiveImageId(newImg.id);
          }
          return next;
        });
      };
      img.onerror = () => {
        revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });
  }, [pushHistory]);

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

  // Delete image — revoke blob URL to prevent leaks
  const handleDeleteImage = (id: string) => {
    pushHistory();
    setImages((prev) => {
      const doomed = prev.find((img) => img.id === id);
      if (doomed?.ownsObjectURL) {
        revokeObjectURL(doomed.dataUrl);
      }
      const next = prev.filter((img) => img.id !== id);
      if (activeImageId === id) {
        setActiveImageId(next.length > 0 ? next[0].id : null);
        setFocusCategory(null);
      }
      if (referenceImageId === id) {
        setReferenceImageId(null);
      }
      if (splitPeerId === id) {
        setSplitPeerId(null);
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

  // Update crop for active image (re-runs full non-destructive chain on next render)
  // History is NOT pushed here — only on gesture end (pointer-up / pan-end).
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

  /** Capture pre-gesture studio state once per pan/zoom gesture. */
  const handleCropGestureStart = useCallback(() => {
    cropGestureCommittedRef.current = false;
    cropGesturePreRef.current = {
      images: imagesRef.current.map((img) => ({
        ...img,
        crop: { ...img.crop },
        filters: { ...img.filters },
        border: img.border ? { ...img.border } : undefined,
        timestamp: img.timestamp ? { ...img.timestamp } : undefined,
      })),
      activeImageId,
      referenceImageId,
    };
  }, [activeImageId, referenceImageId]);

  /** Push ONE undo checkpoint on release if the gesture mutated crop. */
  const handleCropGestureEnd = useCallback(() => {
    if (cropGestureCommittedRef.current) return;
    const pre = cropGesturePreRef.current;
    if (!pre) return;
    cropGestureCommittedRef.current = true;
    historyRef.current.push(pre);
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
    cropGesturePreRef.current = null;
  }, []);

  // Update aspect ratio for active image
  const handleUpdateCropRatio = (aspectRatio: AspectRatio) => {
    if (!activeImageId) return;
    pushHistory();
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

  // 90° Clockwise rotation for active image
  const handleRotate90 = () => {
    if (!activeImageId) return;
    pushHistory();
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              crop: {
                ...img.crop,
                rotation: ((img.crop.rotation || 0) + 90) % 360,
              },
            }
          : img
      )
    );
  };

  // Flip horizontal (mirror) for active image
  const handleToggleFlipHorizontal = () => {
    if (!activeImageId) return;
    pushHistory();
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              crop: {
                ...img.crop,
                flipHorizontal: !img.crop.flipHorizontal,
              },
            }
          : img
      )
    );
  };

  // Update filters for active image (history coalesced ~800ms per gesture)
  const handleUpdateFilters = (newFilters: Partial<CurateImage["filters"]>) => {
    if (!activeImageId) return;
    if (!filterHistoryArmedRef.current) {
      pushHistory();
      filterHistoryArmedRef.current = true;
      window.setTimeout(() => {
        filterHistoryArmedRef.current = false;
      }, 800);
    }
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
    pushHistory();
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              filters: createDefaultFilters(),
            }
          : img
      )
    );
  };

  // Update upscale multiplier for active image
  const handleUpdateUpscale = (multiplier: UpscaleMultiplier) => {
    if (!activeImageId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              upscaleFactor: multiplier,
            }
          : img
      )
    );
  };

  // Update border for active image
  const handleUpdateBorder = (newBorder: Partial<BorderState>) => {
    if (!activeImageId) return;
    if (!filterHistoryArmedRef.current) {
      pushHistory();
      filterHistoryArmedRef.current = true;
      window.setTimeout(() => {
        filterHistoryArmedRef.current = false;
      }, 800);
    }
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              border: {
                ...(img.border || createDefaultBorder()),
                ...newBorder,
              },
            }
          : img
      )
    );
  };

  // Update timestamp for active image
  const handleUpdateTimestamp = (newTimestamp: Partial<TimestampState>) => {
    if (!activeImageId) return;
    if (!filterHistoryArmedRef.current) {
      pushHistory();
      filterHistoryArmedRef.current = true;
      window.setTimeout(() => {
        filterHistoryArmedRef.current = false;
      }, 800);
    }
    setImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              timestamp: {
                ...(img.timestamp || createDefaultTimestamp()),
                ...newTimestamp,
              },
            }
          : img
      )
    );
  };

  // Batch sync: effects only — NEVER crop/ratio/zoom/pan
  const handleBatchSync = useCallback(() => {
    if (!activeImage) return;
    const { filters, border, timestamp, upscaleFactor } = activeImage;
    pushHistory();

    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        // Individual crop (aspectRatio, zoom, panX, panY) is strictly preserved!
        filters: { ...filters },
        border: border ? { ...border } : undefined,
        timestamp: timestamp ? { ...timestamp } : undefined,
        upscaleFactor,
      }))
    );
    setSyncSuccess(true);
    window.setTimeout(() => setSyncSuccess(false), 2000);
  }, [activeImage, pushHistory]);

  const handleUndo = useCallback(() => {
    const snap = historyRef.current.undo({
      images,
      activeImageId,
      referenceImageId,
    });
    if (!snap) return;
    isApplyingHistoryRef.current = true;
    setImages(snap.images);
    setActiveImageId(snap.activeImageId);
    setReferenceImageId(snap.referenceImageId);
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
    queueMicrotask(() => {
      isApplyingHistoryRef.current = false;
    });
  }, [images, activeImageId, referenceImageId]);

  const handleRedo = useCallback(() => {
    const snap = historyRef.current.redo({
      images,
      activeImageId,
      referenceImageId,
    });
    if (!snap) return;
    isApplyingHistoryRef.current = true;
    setImages(snap.images);
    setActiveImageId(snap.activeImageId);
    setReferenceImageId(snap.referenceImageId);
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
    queueMicrotask(() => {
      isApplyingHistoryRef.current = false;
    });
  }, [images, activeImageId, referenceImageId]);

  const handleSaveAesthetic = (name: string) => {
    if (!activeImage) return;
    const list = saveOrUpdateAestheticPreset(
      name,
      activeImage.filters,
      activeImage.border,
      activeImage.timestamp
    );
    setAestheticPresets(list);
  };

  const handleBatchApplyPreset = useCallback((preset: FilmPreset) => {
    pushHistory();
    const updates = applySignaturePresetToFilterState(preset);
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        filters: {
          ...img.filters,
          ...updates,
        },
      }))
    );
    setSyncSuccess(true);
    window.setTimeout(() => setSyncSuccess(false), 2000);
  }, [pushHistory]);

  const handleApplyAesthetic = (preset: AestheticPreset) => {
    pushHistory();
    setImages((prev) => applyAestheticToSeries(prev, preset));
    setSyncSuccess(true);
    window.setTimeout(() => setSyncSuccess(false), 2000);
  };

  const handleDeleteAesthetic = (id: string) => {
    setAestheticPresets(deleteAestheticPreset(id));
  };

  const handleUpdateCropBoth = (panX: number, panY: number, zoom: number) => {
    // Locked sync zoom/pan for Split View (preserves each image's aspect ratio)
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === activeImageId || img.id === splitPeerId) {
          return { ...img, crop: { ...img.crop, panX, panY, zoom } };
        }
        return img;
      })
    );
  };

  const handleToggleSplitView = () => {
    setSplitView((v) => {
      const next = !v;
      if (next && activeImageId) {
        const peer =
          images.find((img) => img.id !== activeImageId)?.id || null;
        setSplitPeerId(peer);
      } else {
        setSplitPeerId(null);
      }
      return next;
    });
  };

  // Add slices from Panorama Splitter to the studio series
  const handleAddPanoramaSlices = (slices: PanoramaSlice[]) => {
    const newItems: CurateImage[] = slices.map((slice, idx) =>
      createCurateImage(
        `pano_${Date.now()}_${idx}`,
        slice.filename,
        slice.dataUrl,
        slice.width,
        slice.height
      )
    );
    setImages((prev) => [...prev, ...newItems]);
  };

  // Add generated Story Collage to the studio series
  const handleAddCollage = (blob: Blob, dataUrl: string) => {
    const newCollage = createCurateImage(
      `collage_${Date.now()}`,
      `story_dump_kolaj_${Date.now()}.jpg`,
      dataUrl,
      1080,
      1920
    );
    setImages((prev) => [...prev, newCollage]);
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
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (isInspectorOpen) {
          setIsInspectorOpen(false);
        } else if (activeImageId) {
          setActiveImageId(null);
          setFocusCategory(null);
          setSplitView(false);
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
  }, [images, activeImageId, isExportModalOpen, isInspectorOpen, focusCategory, handleUndo, handleRedo]);

  return (
    <main
      className="h-dvh w-screen flex flex-col bg-black text-neutral-100 overflow-hidden relative"
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
        onOpenPanoramaModal={() => setIsPanoramaModalOpen(true)}
        onOpenCollageModal={() => setIsCollageModalOpen(true)}
        onExitEdit={() => {
          setActiveImageId(null);
          setFocusCategory(null);
          setSplitView(false);
        }}
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
            onSelectImage={(id) => {
              setActiveImageId(id);
              setFocusCategory(null);
              setIsInspectorOpen(true);
            }}
            onSetReference={handleSetReference}
            onDeleteImage={handleDeleteImage}
            onUploadClick={() => fileInputRef.current?.click()}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onBatchSync={handleBatchSync}
            onBatchApplyPreset={handleBatchApplyPreset}
            syncSuccess={syncSuccess}
            hasActiveEffects={Boolean(
              images[0] &&
                (images[0].filters.activePresetId ||
                  images[0].filters.grainEnabled ||
                  images[0].filters.halationEnabled ||
                  images[0].filters.vignetteEnabled)
            )}
          />
        ) : (
          /* Stage 2/3: Active Photo Edit Studio — Apple Pro Workspace */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Main Studio Area: Canvas + Docked Apple Studio Inspector */}
            <div className="flex-1 min-h-0 flex overflow-hidden relative">
              {/* Canvas stage: completely unobstructed, auto-centered */}
              <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-black">
                {splitView && activeImage && splitPeerId ? (
                  <SplitViewPreview
                    left={activeImage}
                    right={
                      images.find((i) => i.id === splitPeerId) || activeImage
                    }
                    referenceImage={referenceImage}
                    guide={guide}
                    overlay={overlay}
                    showOriginal={showOriginal}
                    onUpdateCropBoth={handleUpdateCropBoth}
                    onSetShowOriginal={setShowOriginal}
                    onCropGestureStart={handleCropGestureStart}
                    onCropGestureEnd={handleCropGestureEnd}
                  />
                ) : (
                  <ViewportCanvas
                    image={activeImage}
                    referenceImage={referenceImage}
                    guide={guide}
                    overlay={overlay}
                    showOriginal={showOriginal}
                    onUpdateCrop={handleUpdateCrop}
                    onSetShowOriginal={setShowOriginal}
                    onCropGestureStart={handleCropGestureStart}
                    onCropGestureEnd={handleCropGestureEnd}
                  />
                )}

                {/* Desktop Apple Glass Capsule (Quick Canvas Controls) */}
                <div className="hidden sm:block">
                  <CanvasQuickControls
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    showOriginal={showOriginal}
                    onSetShowOriginal={setShowOriginal}
                    splitView={splitView}
                    onToggleSplitView={handleToggleSplitView}
                    onBatchSync={handleBatchSync}
                    syncSuccess={syncSuccess}
                    isInspectorOpen={isInspectorOpen}
                    onToggleInspector={() => setIsInspectorOpen((v) => !v)}
                    onExitStudio={() => {
                      setActiveImageId(null);
                      setFocusCategory(null);
                      setSplitView(false);
                    }}
                  />
                </div>
              </div>

              {/* Desktop Apple Studio Inspector (Docked Right Sidebar) */}
              {isInspectorOpen && (
                <div className="hidden sm:flex flex-col w-84 md:w-88 lg:w-96 border-l border-white/10 bg-neutral-950/85 backdrop-blur-2xl h-full overflow-hidden shadow-2xl z-20 shrink-0 transition-all duration-300">
                  <ControlToolbar
                    layout="sidebar"
                    image={activeImage}
                    images={images}
                    referenceImageId={referenceImageId}
                    activeGuide={guide}
                    activeOverlay={overlay}
                    showOriginal={showOriginal}
                    onUpdateCropRatio={handleUpdateCropRatio}
                    onUpdateZoom={(z) => {
                      if (!activeImage) return;
                      handleCropGestureStart();
                      handleUpdateCrop(activeImage.crop.panX, activeImage.crop.panY, z);
                      handleCropGestureEnd();
                    }}
                    onRotate90={handleRotate90}
                    onToggleFlipHorizontal={handleToggleFlipHorizontal}
                    onUpdateGuide={setGuide}
                    onUpdateOverlay={setOverlay}
                    onUpdateFilters={handleUpdateFilters}
                    onUpdateBorder={handleUpdateBorder}
                    onUpdateTimestamp={handleUpdateTimestamp}
                    onBatchSync={handleBatchSync}
                    onResetFilters={handleResetFilters}
                    onSetShowOriginal={setShowOriginal}
                    onUpdateUpscale={handleUpdateUpscale}
                    onExportSingle={handleExportSingle}
                    onExportDump={() => setIsExportModalOpen(true)}
                    onExitEdit={() => {
                      setActiveImageId(null);
                      setFocusCategory(null);
                      setSplitView(false);
                    }}
                    focusCategory={focusCategory}
                    onCloseFocus={() => setIsInspectorOpen(false)}
                    aestheticPresets={aestheticPresets}
                    onSaveAesthetic={handleSaveAesthetic}
                    onApplyAesthetic={handleApplyAesthetic}
                    onDeleteAesthetic={handleDeleteAesthetic}
                    splitView={splitView}
                    onToggleSplitView={handleToggleSplitView}
                    onSetReference={handleSetReference}
                  />
                </div>
              )}
            </div>

            {/* Mobile iOS-style bottom sheet (transform-only) */}
            <MobileStudioSheet
              images={images}
              activeImage={activeImage}
              activeImageId={activeImageId}
              referenceImageId={referenceImageId}
              focusCategory={focusCategory}
              onFocusCategory={setFocusCategory}
              guide={guide}
              overlay={overlay}
              showOriginal={showOriginal}
              splitView={splitView}
              onToggleSplitView={handleToggleSplitView}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onBatchSync={handleBatchSync}
              syncSuccess={syncSuccess}
              onUpdateCropRatio={handleUpdateCropRatio}
              onUpdateZoom={(z) => {
                if (!activeImage) return;
                handleCropGestureStart();
                handleUpdateCrop(activeImage.crop.panX, activeImage.crop.panY, z);
                handleCropGestureEnd();
              }}
              onRotate90={handleRotate90}
              onToggleFlipHorizontal={handleToggleFlipHorizontal}
              onUpdateGuide={setGuide}
              onUpdateOverlay={setOverlay}
              onUpdateFilters={handleUpdateFilters}
              onUpdateBorder={handleUpdateBorder}
              onUpdateTimestamp={handleUpdateTimestamp}
              onResetFilters={handleResetFilters}
              onSetShowOriginal={setShowOriginal}
              onUpdateUpscale={handleUpdateUpscale}
              onExportSingle={handleExportSingle}
              onExportDump={() => setIsExportModalOpen(true)}
              onExitEdit={() => {
                setActiveImageId(null);
                setFocusCategory(null);
                setSplitView(false);
              }}
              aestheticPresets={aestheticPresets}
              onSaveAesthetic={handleSaveAesthetic}
              onApplyAesthetic={handleApplyAesthetic}
              onDeleteAesthetic={handleDeleteAesthetic}
              onSelectImage={(id) => {
                setActiveImageId(id);
                setIsInspectorOpen(true);
              }}
              onSetReference={handleSetReference}
              onDeleteImage={handleDeleteImage}
              onReorder={handleReorder}
              onUploadClick={() => fileInputRef.current?.click()}
            />

            {/* Desktop filmstrip */}
            <div className="hidden sm:block border-t border-white/10 shrink-0">
              <DumpFilmstrip
                images={images}
                activeImageId={activeImageId}
                referenceImageId={referenceImageId}
                onSelectImage={(id) => {
                  setActiveImageId(id);
                  setFocusCategory(null);
                  setIsInspectorOpen(true);
                }}
                onSetReference={handleSetReference}
                onDeleteImage={handleDeleteImage}
                onReorder={handleReorder}
                onUploadClick={() => fileInputRef.current?.click()}
              />
            </div>
          </div>
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


      {/* Standalone Panorama Splitter Modal */}
      <PanoramaSplitterModal
        isOpen={isPanoramaModalOpen}
        images={images}
        onClose={() => setIsPanoramaModalOpen(false)}
        onAddSlicesToStudio={handleAddPanoramaSlices}
      />

      {/* Standalone 9:16 Instagram Story Dump Collage Modal */}
      <StoryCollageModal
        isOpen={isCollageModalOpen}
        images={images}
        onClose={() => setIsCollageModalOpen(false)}
        onAddCollageToStudio={handleAddCollage}
      />

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

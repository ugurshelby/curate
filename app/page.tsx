"use client";

import React, { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Layers,
  Smartphone,
  Frame,
  ZoomIn,
  Wand2,
  ChevronRight,
  ShieldCheck,
  ImagePlus,
  Images,
  Trash2,
} from "lucide-react";
import { CarouselStudio } from "@/components/studio/CarouselStudio";
import { StoryStudio } from "@/components/studio/StoryStudio";
import { FrameStudio } from "@/components/studio/FrameStudio";
import { UpscaleStudio } from "@/components/studio/UpscaleStudio";
import { EditStudio } from "@/components/studio/EditStudio";
import { StudioModule, StudioItem, useStudio, createStudioItem } from "@/lib";
import { ReferencePicker } from "@/components/studio/ReferencePicker";
import { tr } from "@/lib/i18n/tr";
import { useDeviceStorage } from "@/components/studio/DeviceSync";
import { Switch } from "@/components/studio/Switch";
import { formatBytes } from "@/lib";

const MODULE_ORDER: { id: StudioModule; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "carousel", icon: Layers },
  { id: "story", icon: Smartphone },
  { id: "edit", icon: Wand2 },
  { id: "frame", icon: Frame },
  { id: "upscale", icon: ZoomIn },
];

/**
 * Module switch with a shared-element transition where the View Transitions API exists (CDS §5):
 * the hub card title morphs into the module header title. Without the API the switch is instant.
 */
function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}

export default function CurateStudioMain() {
  const { state, actions } = useStudio();
  const [activeModule, setActiveModule] = useState<StudioModule | null>(null);
  // The card that shares its title with the module header (one name per page)
  const [lastModule, setLastModule] = useState<StudioModule | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isTrustOpen, setIsTrustOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { status: storage, setRemember } = useDeviceStorage();

  const openModule = (mod: StudioModule) => {
    actions.setModule(mod);
    flushSync(() => setLastModule(mod));
    withViewTransition(() => setActiveModule(mod));
  };

  const closeModule = () => {
    withViewTransition(() => setActiveModule(null));
  };

  if (activeModule === "carousel") return <CarouselStudio onBack={closeModule} />;
  if (activeModule === "story") return <StoryStudio onBack={closeModule} />;
  if (activeModule === "frame") return <FrameStudio onBack={closeModule} />;
  if (activeModule === "upscale") return <UpscaleStudio onBack={closeModule} />;
  if (activeModule === "edit") return <EditStudio onBack={closeModule} onOpenModule={openModule} />;

  const processUploadedFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) return;
    const newItems: StudioItem[] = validFiles.map((file, idx) => createStudioItem(file, state.items.length + idx));
    actions.addItems(newItems);
    actions.selectItem(newItems[0].id);
    openModule("carousel");
  };

  // Reference images join the library; no module opens (secondary, test action)
  const addReferenceFiles = (files: File[]) => {
    const newItems: StudioItem[] = files.map((file, idx) => createStudioItem(file, state.items.length + idx));
    actions.addItems(newItems);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processUploadedFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
      e.target.value = "";
    }
  };

  const count = state.items.length;
  const thumbs = state.items.slice(0, 4);

  return (
    <div className="relative min-h-[100dvh] w-full bg-base text-ink-1 select-none overflow-x-hidden">
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />

      <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-8 pt-[calc(var(--safe-area-top)+12px)] pb-[calc(var(--safe-area-bottom)+24px)] flex flex-col gap-6">
        <header className="flex items-center justify-between gap-3 h-11">
          <div className="flex items-center gap-2.5 min-w-0">
            <div aria-hidden className="w-9 h-9 rounded-md material-card flex items-center justify-center text-headline">
              C
            </div>
            <span className="text-headline text-ink-1">{tr.app.name}</span>
          </div>

          {count > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(tr.hub.clearConfirm)) actions.clearItems();
              }}
              aria-label={tr.hub.clearAll}
              className="touch-target press-sm rounded-md px-2 text-subhead text-ink-2 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span className="num-metric">{count}</span>
            </button>
          )}
        </header>

        <section className="flex flex-col gap-1.5">
          <h1 className="text-display text-ink-1">{tr.hub.title}</h1>
          <p className="text-footnote text-ink-2 max-w-xl">{tr.hub.subtitle}</p>
        </section>

        {/* Single "add photos" path: an inviting surface, not a form box (CDS §8) */}
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            data-drop-zone
            className={`press material-card w-full rounded-[20px] p-4 sm:p-5 flex items-center gap-4 text-left transition-transform duration-200 ${
              isDragging ? "scale-[1.01] !border-accent" : ""
            }`}
          >
            <span
              aria-hidden
              className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center ${
                isDragging ? "bg-accent-fill text-on-accent scale-110" : "bg-accent-fill text-on-accent"
              } transition-transform duration-200`}
            >
              <ImagePlus className="w-6 h-6" />
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-headline text-ink-1">{isDragging ? tr.hub.dropActive : tr.hub.dropTitle}</span>
              <span className="text-footnote text-ink-2">{count > 0 ? tr.hub.libraryCount(count) : tr.hub.dropHint}</span>
            </span>
            {thumbs.length > 0 && (
              <span aria-hidden className="shrink-0 flex -space-x-3">
                {thumbs.map((it) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={it.id}
                    src={it.proxyUrl || it.originalUrl}
                    alt=""
                    draggable={false}
                    className="w-9 h-9 rounded-full object-cover border-2 border-surface"
                  />
                ))}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsReferenceOpen(true)}
            className="touch-target press-sm self-start px-1 text-subhead text-ink-2 flex items-center gap-1.5"
          >
            <Images className="w-4 h-4" />
            <span>{tr.common.loadReference}</span>
          </button>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="modules-heading">
          <h2 id="modules-heading" className="text-caption uppercase text-ink-3">
            {tr.hub.modulesHeading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULE_ORDER.map(({ id, icon: Icon }) => {
              const m = tr.modules[id];
              return (
                <button
                  key={id}
                  type="button"
                  data-module={id}
                  onClick={() => openModule(id)}
                  className="group press material-card rounded-[20px] p-4 flex items-center gap-3.5 text-left hover-fine"
                >
                  <span aria-hidden className="shrink-0 w-11 h-11 rounded-md bg-surface-2 flex items-center justify-center text-ink-1">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-headline text-ink-1"
                        style={lastModule === id ? { viewTransitionName: "module-title" } : undefined}
                      >
                        {m.title}
                      </span>
                      {m.tags.map((t) => (
                        <span key={t} className="material-chip px-2.5 py-0.5 text-caption text-ink-2">
                          {t}
                        </span>
                      ))}
                    </span>
                    <span className="text-footnote text-ink-2 truncate">{m.subtitle}</span>
                  </span>
                  <ChevronRight aria-hidden className="shrink-0 w-4 h-4 text-ink-3" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Device memory (IndexedDB, owner decision D18): on by default, can be turned off */}
        {storage && (
          <section className="material-card rounded-[20px] p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span id="remember-title" className="text-subhead text-ink-1">
                {tr.hub.rememberTitle}
              </span>
              <span data-storage-status className="text-footnote text-ink-2">
                {storage.state === "unavailable"
                  ? tr.hub.rememberStatus.unavailable
                  : storage.state === "off"
                    ? tr.hub.rememberStatus.off
                    : storage.state === "full"
                      ? tr.hub.rememberStatus.full(storage.keptCount)
                      : storage.state === "partial"
                        ? tr.hub.rememberStatus.partial(storage.keptCount, formatBytes(storage.keptBytes), storage.skippedCount)
                        : tr.hub.rememberStatus.kept(storage.keptCount, formatBytes(storage.keptBytes))}
              </span>
            </div>
            <Switch
              checked={storage.remember && storage.available}
              disabled={!storage.available}
              labelledBy="remember-title"
              onChange={(on) => setRemember(on)}
            />
          </section>
        )}

        {/* Single trust badge instead of a log-like footer (CDS §7) */}
        <section className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => setIsTrustOpen((v) => !v)}
            aria-expanded={isTrustOpen}
            className="touch-target press-sm material-chip px-3.5 text-subhead text-ink-1 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-ink-2" />
            <span>{tr.hub.trustBadge}</span>
          </button>
          {isTrustOpen && <p className="text-footnote text-ink-2 max-w-xl animate-panel-in">{tr.hub.trustDetail}</p>}
        </section>
      </div>

      <ReferencePicker
        open={isReferenceOpen}
        onClose={() => setIsReferenceOpen(false)}
        onConfirm={addReferenceFiles}
        maxSelect={13}
      />
    </div>
  );
}

"use client";

import { useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhotoCaptureProps {
  visitId: string;
  onPhotoAdded?: (url: string) => void;
}

interface UploadResult {
  url: string;
  photoCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotoCapture({ visitId, onPhotoAdded }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [capturedUrls, setCapturedUrls] = useState<string[]>([]);
  const [previewObjectUrls, setPreviewObjectUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Track the most recently captured preview (before upload resolves)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  // Modal state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show immediate preview
      const objectUrl = URL.createObjectURL(file);
      setPendingPreview(objectUrl);
      setUploadError(null);
      setUploading(true);

      try {
        // Mirror the auth-token resolution order used by api-client.ts:
        // 1. auth-token cookie, 2. auth-token in localStorage
        const token = (() => {
          if (typeof document === "undefined") return null;
          const cookieMatch = document.cookie
            .split("; ")
            .find((row) => row.startsWith("auth-token="));
          if (cookieMatch) return decodeURIComponent(cookieMatch.split("=")[1]);
          return typeof localStorage !== "undefined"
            ? localStorage.getItem("auth-token")
            : null;
        })();

        const res = await fetch(`/api/v1/uploads/visit-photo/${visitId}`, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "image/jpeg",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: file,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? `Upload failed (${res.status})`);
        }

        const data = (await res.json()) as UploadResult;

        // Replace the temporary object URL with the server URL
        setCapturedUrls((prev) => [...prev, data.url]);
        setPreviewObjectUrls((prev) => [...prev, objectUrl]);
        setPendingPreview(null);

        onPhotoAdded?.(data.url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
        URL.revokeObjectURL(objectUrl);
        setPendingPreview(null);
      } finally {
        setUploading(false);
        // Reset input so the same file can be re-selected after an error
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [visitId, onPhotoAdded]
  );

  const openCamera = () => {
    inputRef.current?.click();
  };

  // Determine all thumbnails to show: already-uploaded + pending preview
  const allPreviews: Array<{ src: string; serverUrl?: string }> = [
    ...previewObjectUrls.map((src, i) => ({ src, serverUrl: capturedUrls[i] })),
    ...(pendingPreview ? [{ src: pendingPreview }] : []),
  ];

  return (
    <div className="space-y-3">
      {/* Hidden file input — capture="environment" targets the rear camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Take Photo button */}
      <button
        type="button"
        onClick={openCamera}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 py-3 text-sm font-medium text-stone-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      >
        {uploading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Uploading photo…
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
            Take Photo
          </>
        )}
      </button>

      {/* Upload error */}
      {uploadError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {uploadError}
        </p>
      )}

      {/* Thumbnail strip */}
      {allPreviews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allPreviews.map((item, idx) => (
            <div key={idx} className="relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={`Visit photo ${idx + 1}`}
                className={`h-16 w-16 rounded-lg object-cover ring-2 ${
                  item.serverUrl
                    ? "cursor-pointer ring-stone-200 hover:ring-amber-400"
                    : "ring-amber-300 opacity-70"
                } transition-all`}
                onClick={() => {
                  if (item.serverUrl) {
                    setLightboxUrl(item.serverUrl);
                  }
                }}
              />
              {/* Uploading spinner overlay on the pending thumbnail */}
              {!item.serverUrl && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {/* Photo number badge */}
              {item.serverUrl && (
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/50 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
                  {idx + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Visit photo full size"
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-700 shadow-lg hover:bg-stone-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <a
              href={lightboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-lg hover:bg-stone-100"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Open full size
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

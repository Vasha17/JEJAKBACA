import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/component/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/component/ui/dialog";

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspect: number; 
  onCropComplete: (croppedUrl: string) => void;
  title?: string;
}

// Helper: Download gambar via fetch (Proxy)
async function fetchImageAsBase64(url: string): Promise<string> {
  const PROXY = `https://kjspeqcrfhzxnodjkznu.supabase.co/functions/v1/img-proxy`;
  
  let targetUrl: string = url;
        
  if (typeof window !== "undefined") {
    const encodedUrl = encodeURIComponent(url);
    targetUrl = `${PROXY}?url=${encodedUrl}`;
  }

  console.log("[Proxy] Fetching:", targetUrl);

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(targetUrl, { signal: controller.signal });
  clearTimeout(id);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Proxy Error Response:", errorText);
    throw new Error(`Failed to download image (Status ${response.status}): ${errorText}`);
  }
  
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {  
  const isExternalUrl = imageSrc.startsWith('http');
  let finalImageSrc = imageSrc;
  
  if (isExternalUrl) {
    try {
      await new Promise(resolve => requestIdleCallback(() => resolve(null)));
      finalImageSrc = await fetchImageAsBase64(imageSrc);
    } catch (e) {
      throw new Error("Failed to download external image. Check your internet connection.");
    }
  }

  const image = new Image();  

  if (!pixelCrop.width || !pixelCrop.height) {
    throw new Error("Invalid crop size.");
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      requestAnimationFrame(() => resolve()); 
    };
    image.onerror = () => { 
      reject(new Error("Failed to load image."));
    };
    image.src = finalImageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(pixelCrop.width);
  canvas.height = Math.floor(pixelCrop.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Failed to create 2D canvas context.");

  try {
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );
  } catch (err) {
    throw new Error("Failed to draw image to Canvas.");
  }
  
  try {
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (err) {
    throw new Error("Failed to convert Canvas to Base64.");
  }
}

export function ImageCropper({
  open, onOpenChange, imageSrc, aspect, onCropComplete, title = "Reposition Image",
}: ImageCropperProps) {  
  const [imageLoading, setImageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  useEffect(() => {
    if (open) {
      setImageLoading(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setIsSaving(false);
    }
  }, [open, imageSrc]);

  const onCropDone = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    
    setTimeout(async () => {
      try {      
        const croppedUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedUrl);
        onOpenChange(false);
      } catch (e: any) {
        console.error("Crop failed:", e);
        alert(`Error: ${e.message}`);
      } finally {
        setIsSaving(false);
      }
    }, 50);
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && imageLoading) return;
    onOpenChange(newOpen);
  };

  const handleDragHandleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleDragHandleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchEnd - touchStart;
    
    if (diff > 80) {
      onOpenChange(false);
    }
  };

  if (!open || !imageSrc) return null;

  // ── Desktop Content (Fixed Cancel logic) ────────────────────────────────────
  const desktopContent = (
    <>
      <div className="relative w-full flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[200px]">
        {imageLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-white/50 text-sm">
            Loading image...
          </div>
        )}
        
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropDone}
          onMediaLoaded={(mediaSize) => {
              console.log("Media loaded:", mediaSize);
              setImageLoading(false);
          }}
          classes={{ containerClassName: "w-full h-full" }}
        />
      </div>

      <div className="p-4 bg-card border-t border-border/50">
        <div className="mb-4">
          <label className="text-xs text-muted-foreground block mb-1">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            disabled={imageLoading} 
          />
        </div>
        
        <DialogFooter className="p-0 px-0 gap-2 w-full">
          <Button 
            variant="ghost" 
            onClick={() => handleOpenChange(false)} // FIXED: Calls close directly
            disabled={imageLoading || isSaving} 
            className="flex-1 h-10"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={imageLoading || isSaving} className="flex-1 h-10">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );

  // ── Desktop View ────────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg h-[85vh] sm:h-auto w-full p-0 overflow-hidden bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl text-foreground rounded-xl z-[100]">
          <DialogHeader className="p-4 pb-0 flex items-center justify-between border-b border-border/50">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </DialogHeader>
          {desktopContent}
        </DialogContent>
      </Dialog>
    );
  }

  // ── Mobile: Bottom Sheet ────────────────────────────────────────────────────
  return (
    // Added z-[100] to fixed container to ensure it sits on top of Rating Cards, etc.
    <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none"> 
      {/* Backdrop - pointer-events-auto enables clicking to close */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => onOpenChange(false)} />
      
      <div 
        className="relative flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom duration-300 pointer-events-auto"
        style={{ 
          maxHeight: "92vh", 
          background: "hsl(var(--card))", 
          borderTop: "1px solid hsl(var(--border))", 
          boxShadow: "0 -24px 60px rgba(0,0,0,0.4)" 
        }}
      >
        {/* 1. Drag Handle */}
        <div 
          className="flex justify-center pt-3 shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragHandleTouchStart}
          onTouchEnd={handleDragHandleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* 2. Header (Title + Actions) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <h2 className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* FIXED: Cancel now calls handleOpenChange(false) -> Closes immediately */}
            <Button 
              variant="ghost" 
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
              className="h-8 px-3 text-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="h-8 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* 3. Main Content (Cropper) */}
        <div className="relative flex-1 bg-black min-h-[300px]">
           {imageLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-white/50 text-sm">
              Loading image...
            </div>
          )}
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropDone}
            onMediaLoaded={() => setImageLoading(false)}
            classes={{ containerClassName: "w-full h-full" }}
          />
        </div>

        {/* 4. Footer (Zoom only on mobile) */}
        <div className="p-4 bg-card border-t border-border/50 shrink-0">
          <div className="mb-4">
            <label className="text-xs text-muted-foreground block mb-1">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              disabled={imageLoading || isSaving} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
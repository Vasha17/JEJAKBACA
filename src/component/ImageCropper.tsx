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

// Fungsi helper untuk crop gambar
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  // Hanya set crossOrigin untuk URL eksternal
  if (!imageSrc.startsWith("blob:") && !imageSrc.startsWith("data:")) {
    image.crossOrigin = "anonymous";
  }
  
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (e) => { 
      console.error("Image load error", e); 
      reject(e); 
    };
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function ImageCropper({
  open, onOpenChange, imageSrc, aspect, onCropComplete, title = "Reposition Image",
}: ImageCropperProps) {
  // State untuk melacak apakah gambar sedang dimuat
  const [imageLoading, setImageLoading] = useState(true);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Reset state setiap kali dialog dibuka
  useEffect(() => {
    if (open) {
      setImageLoading(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropDone = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      // Pastikan proses save selesai sebelum menutup
      const croppedUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedUrl);
      onOpenChange(false);
    } catch (e) {
      console.error("Crop failed:", e);
    }
  };

  // Handler khusus untuk menutup dialog dengan validasi loading
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && imageLoading) return;
    
    onOpenChange(newOpen);
  };

  if (!open || !imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {/* Container Cropper dengan Background Gelap */}
        <div className="relative w-full h-[300px] sm:h-[400px] bg-black flex items-center justify-center">
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
                setImageLoading(false);
            }}
          />
        </div>

        <div className="px-4 pb-2">
          <label className="text-xs text-muted-foreground block mb-1">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            disabled={imageLoading} 
          />
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={imageLoading} 
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={imageLoading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
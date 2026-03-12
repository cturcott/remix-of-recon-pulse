import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface VinScannerProps {
  onScan: (vin: string) => void;
}

export default function VinScanner({ onScan }: VinScannerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "vin-scanner-reader";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(readerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 100 },
          aspectRatio: 3,
        },
        (decodedText) => {
          // VINs are 17 alphanumeric chars (excluding I, O, Q)
          const cleaned = decodedText.replace(/[^A-HJ-NPR-Z0-9]/gi, "").toUpperCase();
          if (cleaned.length === 17) {
            onScan(cleaned);
            setOpen(false);
          }
        },
        () => {} // ignore scan failures
      );
    } catch (err: any) {
      setError(
        err?.message?.includes("NotAllowedError")
          ? "Camera access denied. Please allow camera permissions."
          : "Unable to start camera. Make sure you're on a secure connection (HTTPS)."
      );
    }
  }, [onScan]);

  useEffect(() => {
    if (open) {
      // Small delay to let dialog mount the element
      const timeout = setTimeout(startScanner, 300);
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Detect mobile/tablet via touch support + screen width
  const isMobile = typeof window !== "undefined" && (
    "ontouchstart" in window || navigator.maxTouchPoints > 0
  ) && window.innerWidth < 1024;

  if (!isMobile) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Scan VIN barcode"
        className="shrink-0"
      >
        <Camera className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan VIN Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Point your camera at the VIN barcode on the vehicle.
            </p>
            <div
              id={readerId}
              className="w-full rounded-md overflow-hidden bg-muted min-h-[160px]"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

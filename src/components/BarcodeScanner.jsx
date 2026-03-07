import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const stoppedRef = useRef(false);
  const idRef = useRef("barcode-reader-" + crypto.randomUUID());
  const [error, setError] = useState("");

  useEffect(() => {
    let scanner = null;
    stoppedRef.current = false;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(idRef.current, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 250, height: 150 } },
          (code) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            scanner.stop().then(() => { scanner.clear(); }).catch(() => {});
            onScan(code);
          },
          () => {}
        );
      } catch {
        setError("Camera access denied or unavailable. Check permissions.");
      }
    };

    startScanner();

    return () => {
      stoppedRef.current = true;
      if (scanner) {
        const s = scanner.getState && scanner.getState();
        if (s === 2) {
          scanner.stop().then(() => { scanner.clear(); }).catch(() => {});
        } else {
          try { scanner.clear(); } catch {}
        }
      }
    };
  }, []);

  function handleClose() {
    stoppedRef.current = true;
    const scanner = scannerRef.current;
    if (scanner) {
      const s = scanner.getState && scanner.getState();
      if (s === 2) {
        scanner.stop().then(() => { scanner.clear(); onClose(); }).catch(() => { onClose(); });
        return;
      }
      try { scanner.clear(); } catch {}
    }
    onClose();
  }

  return (
    <div className="scanner-overlay" onClick={handleClose}>
      <div className="scanner-box" onClick={e => e.stopPropagation()}>
        <div className="scanner-head">
          <span>Scan Barcode</span>
          <button aria-label="Close scanner" onClick={handleClose}>&times;</button>
        </div>
        <div id={idRef.current}></div>
        {error ? <p className="scanner-hint" style={{ color: "#fe00a4" }}>{error}</p>
          : <p className="scanner-hint">Point camera at a food barcode</p>}
      </div>
    </div>
  );
}

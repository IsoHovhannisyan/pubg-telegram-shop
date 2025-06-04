import React, { useEffect, useRef } from 'react';

const WebViewOverlay = ({ url, children }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Function to inject CSS that hides the original page content
    const injectStyles = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Create and inject style element
      const style = iframeDoc.createElement('style');
      style.textContent = `
        body {
          height: 0 !important;
          overflow: hidden !important;
          opacity: 0 !important;
        }
        /* Keep the page functional but invisible */
        body * {
          visibility: hidden !important;
        }
      `;
      iframeDoc.head.appendChild(style);
    };

    // Wait for iframe to load before injecting styles
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = injectStyles;
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Invisible iframe containing the original page */}
      <iframe
        ref={iframeRef}
        src={url}
        className="absolute inset-0 w-full h-full opacity-0"
        style={{ zIndex: 0 }}
      />
      
      {/* Custom overlay content */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default WebViewOverlay; 
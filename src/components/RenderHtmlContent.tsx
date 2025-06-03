'use client';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface RenderHtmlContentProps {
  htmlString: string;
}

const RenderHtmlContent: React.FC<RenderHtmlContentProps> = ({ htmlString }) => {
  const [mounted, setMounted] = useState(false);
  const injectedNodesRef = useRef<Node[]>([]);

  useEffect(() => {
    setMounted(true); // Set mounted to true once the component mounts on the client
  }, []);

  useEffect(() => {
    // Cleanup previously injected nodes
    injectedNodesRef.current.forEach(node => {
      if (node.parentNode === document.body) { // Check parentNode before removing
        document.body.removeChild(node);
      }
    });
    injectedNodesRef.current = []; // Clear the ref

    if (mounted && htmlString && typeof window !== 'undefined' && document.body) {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlString;
      
      const nodesToAppend: Node[] = Array.from(tempContainer.childNodes);
      
      nodesToAppend.forEach(node => {
        document.body.appendChild(node);
        injectedNodesRef.current.push(node);
      });
    }

    return () => {
      // Cleanup on unmount or when htmlString changes
      injectedNodesRef.current.forEach(node => {
        if (node.parentNode === document.body) {
          document.body.removeChild(node);
        }
      });
      injectedNodesRef.current = [];
    };
  }, [mounted, htmlString]);

  return null;
};

export default RenderHtmlContent;

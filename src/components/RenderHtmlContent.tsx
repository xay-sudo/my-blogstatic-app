'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';

interface RenderHtmlContentProps {
  /**
   * The HTML string to be rendered.
   */
  htmlString: string;
}

/**
 * A client component that injects a raw HTML string directly into the document's <body>.
 * It renders null itself to avoid interfering with SSR/hydration,
 * then appends the parsed HTML content via useEffect on the client-side.
 * It also handles cleanup of the injected elements.
 */
const RenderHtmlContent: React.FC<RenderHtmlContentProps> = ({ htmlString }) => {
  const injectedNodesRef = useRef<Node[]>([]);

  useEffect(() => {
    // Clear previously injected nodes
    injectedNodesRef.current.forEach(node => {
      if (node.parentNode === document.body) {
        document.body.removeChild(node);
      }
    });
    injectedNodesRef.current = [];

    if (htmlString && typeof window !== 'undefined' && document.body) {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlString;

      const fragment = document.createDocumentFragment();
      const newNodes: Node[] = [];
      while (tempContainer.firstChild) {
        const node = tempContainer.firstChild;
        fragment.appendChild(node);
        newNodes.push(node);
      }

      if (fragment.childNodes.length > 0) {
        document.body.appendChild(fragment);
        injectedNodesRef.current = newNodes;
      }
    }

    // Cleanup function for when the component unmounts or htmlString changes
    return () => {
      injectedNodesRef.current.forEach(node => {
        if (node.parentNode === document.body) {
          document.body.removeChild(node);
        }
      });
      injectedNodesRef.current = [];
    };
  }, [htmlString]); // Re-run if htmlString changes

  return null; // This component renders nothing itself into the React tree
};

export default RenderHtmlContent;
'use client';

import type React from 'react';
import { useEffect } from 'react';

interface HeadScriptInjectorProps {
  htmlString?: string;
}

/**
 * A client component that injects a raw HTML string directly into the document's <head>.
 * It renders null itself to avoid interfering with SSR/hydration of the head structure,
 * then appends the parsed HTML content via useEffect on the client-side.
 */
const HeadScriptInjector: React.FC<HeadScriptInjectorProps> = ({ htmlString }) => {
  useEffect(() => {
    if (htmlString && typeof window !== 'undefined' && document.head) {
      // Create a temporary element to parse the HTML string
      // This allows us to extract all nodes, including scripts, meta tags, etc.
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlString;

      // Append all child nodes from the temporary container to a document fragment
      const fragment = document.createDocumentFragment();
      while (tempContainer.firstChild) {
        fragment.appendChild(tempContainer.firstChild);
      }

      // Append the fragment to the actual document.head
      // This ensures scripts are executed and tags are correctly placed.
      if (fragment.childNodes.length > 0) {
        document.head.appendChild(fragment);
      }
    }
  }, [htmlString]); // Re-run if htmlString changes

  return null; // This component renders nothing itself into the React tree
};

export default HeadScriptInjector;

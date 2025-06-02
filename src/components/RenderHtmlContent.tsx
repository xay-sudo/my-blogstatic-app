
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';

interface RenderHtmlContentProps {
  /**
   * The HTML string to be rendered.
   */
  htmlString: string;
  /**
   * Optional CSS classes to apply to the wrapper div that will contain the HTML.
   */
  className?: string;
}

/**
 * A component to safely render an HTML string, deferring actual content rendering
 * to client-side to avoid hydration mismatches.
 */
const RenderHtmlContent: React.FC<RenderHtmlContentProps> = ({ htmlString, className = "" }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !htmlString) {
    // If not mounted yet, or if there's no HTML string, render nothing.
    // This prevents a <div> placeholder from appearing in the <head> or an empty div elsewhere.
    return null;
  }

  // Only render with dangerouslySetInnerHTML on the client after mounting AND if htmlString is present.
  // The div wrapper is used here to apply any className and to host the dangerouslySetInnerHTML.
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlString }}
    />
  );
};

export default RenderHtmlContent;


'use client';

import type React from 'react';
import { useState, useEffect } from 'react';

interface RenderHtmlContentProps {
  /**
   * The HTML string to be rendered.
   */
  htmlString: string;
  /**
   * Optional CSS classes to apply to the wrapper div.
   */
  className?: string;
  /**
   * Optional style to apply to the placeholder to ensure consistent dimensions.
   */
  placeholderStyle?: React.CSSProperties;
}

/**
 * A component to safely render an HTML string, deferring actual content rendering
 * to client-side to avoid hydration mismatches.
 */
const RenderHtmlContent: React.FC<RenderHtmlContentProps> = ({ htmlString, className = "", placeholderStyle }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Render a placeholder div with the same class/style to maintain layout,
    // but without the content that causes hydration issues.
    // This ensures the server and initial client render match.
    return <div className={className} style={placeholderStyle} />;
  }

  // Only render with dangerouslySetInnerHTML on the client after mounting.
  // If htmlString is still falsy after mounting, render the placeholder.
  if (!htmlString) {
    return <div className={className} style={placeholderStyle} />;
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlString }}
    />
  );
};

export default RenderHtmlContent;

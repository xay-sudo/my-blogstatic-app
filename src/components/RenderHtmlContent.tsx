
import type React from 'react';

interface RenderHtmlContentProps {
  /**
   * The HTML string to be rendered.
   */
  htmlString: string;
  /**
   * Optional CSS classes to apply to the wrapper div.
   */
  className?: string;
}

/**
 * A component to safely render an HTML string.
 * It uses `dangerouslySetInnerHTML`, so ensure the HTML source is trusted.
 */
const RenderHtmlContent: React.FC<RenderHtmlContentProps> = ({ htmlString, className }) => {
  if (!htmlString) {
    return null;
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: htmlString }}
    />
  );
};

export default RenderHtmlContent;

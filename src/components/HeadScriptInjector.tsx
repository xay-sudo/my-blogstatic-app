'use client';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface HeadScriptInjectorProps {
  htmlString?: string;
}

const HeadScriptInjector: React.FC<HeadScriptInjectorProps> = ({ htmlString }) => {
  const [mounted, setMounted] = useState(false);
  const injectedNodesRef = useRef<Node[]>([]); // Ref to store the actual injected nodes

  useEffect(() => {
    setMounted(true); // Set mounted to true once the component mounts on the client
  }, []);

  useEffect(() => {
    // Cleanup previously injected nodes by this instance
    // This runs when htmlString changes (before the new effect) or when the component unmounts.
    injectedNodesRef.current.forEach(node => {
      if (node.parentNode === document.head) {
        document.head.removeChild(node);
      }
    });
    injectedNodesRef.current = []; // Clear the ref

    if (mounted && htmlString && typeof window !== 'undefined' && document.head) {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlString;
      
      const nodesToAppend: Node[] = Array.from(tempContainer.childNodes); // Get all nodes (scripts, comments, etc.)
      
      // Append nodes to document.head and store references for cleanup
      nodesToAppend.forEach(node => {
        document.head.appendChild(node);
        injectedNodesRef.current.push(node); // Add to ref for cleanup
      });
    }

    // The cleanup function for THIS effect instance will be implicitly handled
    // by the cleanup at the beginning of the effect if htmlString or mounted changes.
    // If the component unmounts, this effect's implicit return (or an explicit one) handles it.
    // Adding an explicit return here ensures cleanup on unmount.
    return () => {
      injectedNodesRef.current.forEach(node => {
        if (node.parentNode === document.head) {
          document.head.removeChild(node);
        }
      });
      injectedNodesRef.current = [];
    };
  }, [mounted, htmlString]); // Re-run if htmlString changes or mounted status changes

  return null; // This component renders nothing itself into the React tree
};

export default HeadScriptInjector;

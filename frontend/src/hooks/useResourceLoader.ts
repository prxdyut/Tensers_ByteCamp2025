import { useEffect } from 'react';

interface ResourceConfig {
  stylesheets?: string[];
  scripts?: string[];
}

export const useResourceLoader = ({ stylesheets = [], scripts = [] }: ResourceConfig) => {
  useEffect(() => {
    // Add stylesheets
    const loadedStylesheets: HTMLLinkElement[] = [];
    stylesheets.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      loadedStylesheets.push(link);
    });

    // Add scripts
    const loadedScripts: HTMLScriptElement[] = [];
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      document.body.appendChild(script);
      loadedScripts.push(script);
    });

    // Cleanup function
    return () => {
      loadedStylesheets.forEach(link => link.remove());
      loadedScripts.forEach(script => script.remove());
    };
  }, []);
}; 
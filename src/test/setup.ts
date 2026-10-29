import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Lazy-loaded routes are compiled on first import in tests, which can exceed the 1s default.
configure({ asyncUtilTimeout: 5000 });

// jsdom doesn't implement scrolling; React Router's ScrollRestoration calls it.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

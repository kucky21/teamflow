import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Explicitní registrace matcherů jest-dom (toBeInTheDocument, toBeDisabled…).
expect.extend(matchers);

afterEach(() => {
  cleanup();
});

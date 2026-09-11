// Runs once before every test file (wired in via vite.config.js's test.setupFiles).
// Adds jest-dom's extra matchers (toBeInTheDocument, toHaveTextContent, etc.) to
// Vitest's `expect` — without this, only plain assertions like toBe/toEqual work.
import '@testing-library/jest-dom';

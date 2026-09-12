// Shared loading fallback — used for the initial auth-check (ProtectedRoute) and for
// Suspense boundaries around lazy-loaded route chunks, so all three show the same
// visual treatment instead of three slightly different "loading" UIs.
// fullScreen=false fills its container instead of the viewport, for use inside a
// layout that already has its own nav/chrome on screen (e.g. Home's content area).
const PageLoader = ({ fullScreen = true }) => (
  <div
    style={{
      minHeight: fullScreen ? '100vh' : '40vh',
      width: '100%',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-on-page)'
    }}
  >
    Loading...
  </div>
);

export default PageLoader;

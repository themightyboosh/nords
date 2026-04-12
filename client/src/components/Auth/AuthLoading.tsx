export function AuthLoading() {
  return (
    <div className="nords-app-container nords-glass" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="auth-spinner">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="var(--nords-color-accent)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="nords-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    </div>
  );
}

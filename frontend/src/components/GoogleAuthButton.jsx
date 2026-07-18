import React, { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

// Shared by SignIn and SignUp — same button, same shape/width, same error copy,
// so the two pages don't each maintain their own copy of this integration.
//
// GoogleLogin only accepts a fixed pixel width (no "100%"), so it has to be measured
// from its wrapper — both to fill the same width as the inputs below it (rather than
// floating as a narrow pill in extra empty space) and to stay responsive on resize.
const GoogleAuthButton = ({ onSuccess, onError, text = 'continue_with' }) => {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const measure = () => {
      // Google's button has a documented max supported width of 400px
      if (wrapRef.current) setWidth(Math.min(400, wrapRef.current.offsetWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="google-btn-wrap" ref={wrapRef}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        text={text}
        shape="pill"
        width={width}
      />
    </div>
  );
};

export default GoogleAuthButton;

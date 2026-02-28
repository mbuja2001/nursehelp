// Dashboard/AuthPage.jsx

import React, { useState } from 'react';
import { styles } from './styles';

const AuthPage = ({
  username,
  setUsername,
  password,
  setPassword,
  handleLogin,
  handleRegister,
  setView
}) => {

  const [mode, setMode] = useState('login'); // login | register
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === 'login') {
      handleLogin(e);
    } else {
      handleRegister({ username, surname, email, password });
    }
  };

  return (
    <div style={styles.patientBg}>
      <div style={styles.loginCard}>
        <h2>{mode === 'login' ? 'Nurse Login' : 'Register Nurse'}</h2>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <input
                type="text"
                placeholder="Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.loginInput}
              />

              <input
                type="text"
                placeholder="Surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                style={{ ...styles.loginInput, marginTop: '10px' }}
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...styles.loginInput, marginTop: '10px' }}
              />
            </>
          )}

          {mode === 'login' && (
            <input
              type="text"
              placeholder="Nurse Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.loginInput}
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...styles.loginInput, marginTop: '10px' }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" style={styles.btnWhite}>
              {mode === 'login' ? 'Login' : 'Register'}
            </button>

            <button
              type="button"
              onClick={() => setView('home')}
              style={styles.btnOutline}
            >
              Back
            </button>
          </div>
        </form>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ ...styles.btnOutline, width: '100%' }}
          >
            {mode === 'login'
              ? 'Create an account'
              : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

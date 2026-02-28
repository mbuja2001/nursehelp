import React from 'react';
import { styles } from './styles';

const HomePage = ({ setView }) => {
  return (
    <div style={styles.patientBg}>
      <div style={styles.hero}>
        <h1 style={{ fontSize: '3rem' }}>Welcome to Nurse Helpdesk</h1>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button onClick={() => setView('requestHelp')} style={styles.btnWhite}>
            Request Help
          </button>
          <button onClick={() => setView('auth')} style={styles.btnOutline}>
            Nurse Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    learn: 'Learn', daily: 'Daily', duels: 'Duels', interview: 'Interview',
    leaderboard: 'Leaderboard', analytics: 'Analytics', resume: 'Resume',
    profile: 'Profile', logout: 'Logout', signIn: 'Sign In', register: 'Register',
    email: 'Email Address', password: 'Password', name: 'Name',
    welcome: 'Accelerate your Python skills with AI',
    aiTutorGreeting: "Hello! I'm your AI Python Tutor. What would you like to learn today?",
    askPlaceholder: 'Ask a Python question...',
    runCode: 'Run Code', output: 'Output',
    focusMode: 'Focus Mode', pomodoroFocus: 'Focus Time', pomodoroBreak: 'Break Time',
    dailyChallenge: 'Daily Challenge', submitSolution: 'Submit Solution',
    mockInterview: 'Mock Interview', startInterview: 'Start Interview',
    explainCode: 'Explain Code', generateResume: 'Generate Resume',
    snippets: 'Snippets'
  },
  hi: {
    learn: '\u0938\u0940\u0916\u0947\u0902', daily: '\u0926\u0948\u0928\u093f\u0915', duels: '\u092e\u0941\u0915\u093e\u092c\u0932\u093e', interview: '\u0938\u093e\u0915\u094d\u0937\u093e\u0924\u094d\u0915\u093e\u0930',
    leaderboard: '\u0932\u0940\u0921\u0930\u092c\u094b\u0930\u094d\u0921', analytics: '\u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923', resume: '\u0930\u093f\u091c\u093c\u094d\u092f\u0942\u092e\u0947',
    profile: '\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932', logout: '\u0932\u0949\u0917 \u0906\u0909\u091f', signIn: '\u0938\u093e\u0907\u0928 \u0907\u0928', register: '\u0930\u091c\u093f\u0938\u094d\u091f\u0930',
    email: '\u0908\u092e\u0947\u0932 \u092a\u0924\u093e', password: '\u092a\u093e\u0938\u0935\u0930\u094d\u0921', name: '\u0928\u093e\u092e',
    welcome: 'AI \u0915\u0947 \u0938\u093e\u0925 \u0905\u092a\u0928\u0947 Python \u0915\u094c\u0936\u0932 \u0915\u094b \u0924\u0947\u091c\u093c \u0915\u0930\u0947\u0902',
    aiTutorGreeting: '\u0928\u092e\u0938\u094d\u0924\u0947! \u092e\u0948\u0902 \u0906\u092a\u0915\u093e AI Python \u091f\u094d\u092f\u0942\u091f\u0930 \u0939\u0942\u0901\u0964 \u0906\u091c \u0906\u092a \u0915\u094d\u092f\u093e \u0938\u0940\u0916\u0928\u093e \u091a\u093e\u0939\u0947\u0902\u0917\u0947?',
    askPlaceholder: 'Python \u0915\u0947 \u092c\u093e\u0930\u0947 \u092e\u0947\u0902 \u092a\u0942\u091b\u0947\u0902...',
    runCode: '\u0915\u094b\u0921 \u091a\u0932\u093e\u090f\u0902', output: '\u0906\u0909\u091f\u092a\u0941\u091f',
    focusMode: '\u092b\u094b\u0915\u0938 \u092e\u094b\u0921', pomodoroFocus: '\u092b\u094b\u0915\u0938 \u0938\u092e\u092f', pomodoroBreak: '\u092c\u094d\u0930\u0947\u0915 \u0938\u092e\u092f',
    dailyChallenge: '\u0926\u0948\u0928\u093f\u0915 \u091a\u0941\u0928\u094c\u0924\u0940', submitSolution: '\u0938\u092c\u092e\u093f\u091f \u0915\u0930\u0947\u0902',
    mockInterview: '\u092e\u0949\u0915 \u0907\u0902\u091f\u0930\u0935\u094d\u092f\u0942', startInterview: '\u0907\u0902\u091f\u0930\u0935\u094d\u092f\u0942 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
    explainCode: '\u0915\u094b\u0921 \u0938\u092e\u091d\u093e\u090f\u0902', generateResume: '\u0930\u093f\u091c\u093c\u094d\u092f\u0942\u092e\u0947 \u092c\u0928\u093e\u090f\u0902',
    snippets: '\u0938\u094d\u0928\u093f\u092a\u0947\u091f\u094d\u0938'
  },
  kn: {
    learn: '\u0c95\u0cb2\u0cbf\u0caf\u0cbf\u0cb0\u0cbf', daily: '\u0ca6\u0cc8\u0ca8\u0cbf\u0c95', duels: '\u0cb8\u0ccd\u0caa\u0cb0\u0ccd\u0ca7\u0cc6', interview: '\u0cb8\u0c82\u0ca6\u0cb0\u0ccd\u0cb6\u0ca8',
    leaderboard: '\u0cb2\u0cc0\u0ca1\u0cb0\u0ccd\u200c\u0cac\u0ccb\u0cb0\u0ccd\u0ca1\u0ccd', analytics: '\u0cb5\u0cbf\u0cb6\u0ccd\u0cb2\u0cc7\u0cb7\u0ca3\u0cc6', resume: '\u0cb0\u0cc6\u0cb8\u0ccd\u0caf\u0cc2\u0cae\u0ccd',
    profile: '\u0caa\u0ccd\u0cb0\u0cca\u0cab\u0cc8\u0cb2\u0ccd', logout: '\u0cb2\u0cbe\u0c97\u0ccd \u0c94\u0c9f\u0ccd', signIn: '\u0cb8\u0cc8\u0ca8\u0ccd \u0c87\u0ca8\u0ccd', register: '\u0ca8\u0ccb\u0c82\u0ca6\u0ca3\u0cbf',
    email: '\u0c87\u0cae\u0cc7\u0cb2\u0ccd \u0cb5\u0cbf\u0cb3\u0cbe\u0cb8', password: '\u0caa\u0cbe\u0cb8\u0ccd\u200c\u0cb5\u0cb0\u0ccd\u0ca1\u0ccd', name: '\u0cb9\u0cc6\u0cb8\u0cb0\u0cc1',
    welcome: 'AI \u0ca8\u0cca\u0c82\u0ca6\u0cbf\u0c97\u0cc6 \u0ca8\u0cbf\u0cae\u0ccd\u0cae Python \u0c95\u0ccc\u0cb6\u0cb2\u0ccd\u0caf\u0c97\u0cb3\u0ca8\u0ccd\u0ca8\u0cc1 \u0cb5\u0cc7\u0c97\u0c97\u0cca\u0cb3\u0cbf\u0cb8\u0cbf',
    aiTutorGreeting: '\u0ca8\u0cae\u0cb8\u0ccd\u0c95\u0cbe\u0cb0! \u0ca8\u0cbe\u0ca8\u0cc1 \u0ca8\u0cbf\u0cae\u0ccd\u0cae AI Python \u0c9f\u0ccd\u0caf\u0cc2\u0c9f\u0cb0\u0ccd. \u0c87\u0c82\u0ca6\u0cc1 \u0c8f\u0ca8\u0cc1 \u0c95\u0cb2\u0cbf\u0caf\u0cb2\u0cc1 \u0cac\u0caf\u0cb8\u0cc1\u0ca4\u0ccd\u0ca4\u0cc0\u0cb0\u0cbf?',
    askPlaceholder: 'Python \u0cac\u0c97\u0ccd\u0c97\u0cc6 \u0c95\u0cc7\u0cb3\u0cbf...',
    runCode: '\u0c95\u0ccb\u0ca1\u0ccd \u0cb0\u0ca8\u0ccd \u0cae\u0cbe\u0ca1\u0cbf', output: '\u0c94\u0c9f\u0ccd\u200c\u0caa\u0cc1\u0c9f\u0ccd',
    focusMode: '\u0cab\u0ccb\u0c95\u0cb8\u0ccd \u0cae\u0ccb\u0ca1\u0ccd', pomodoroFocus: '\u0cab\u0ccb\u0c95\u0cb8\u0ccd \u0cb8\u0cae\u0caf', pomodoroBreak: '\u0cac\u0ccd\u0cb0\u0cc7\u0c95\u0ccd \u0cb8\u0cae\u0caf',
    dailyChallenge: '\u0ca6\u0cc8\u0ca8\u0cbf\u0c95 \u0cb8\u0cb5\u0cbe\u0cb2\u0cc1', submitSolution: '\u0cb8\u0cb2\u0ccd\u0cb2\u0cbf\u0cb8\u0cbf',
    mockInterview: '\u0cae\u0cbe\u0c95\u0ccd \u0c87\u0c82\u0c9f\u0cb0\u0ccd\u0cb5\u0ccd\u0caf\u0cc2', startInterview: '\u0cb8\u0c82\u0ca6\u0cb0\u0ccd\u0cb6\u0ca8 \u0caa\u0ccd\u0cb0\u0cbe\u0cb0\u0c82\u0cad\u0cbf\u0cb8\u0cbf',
    explainCode: '\u0c95\u0ccb\u0ca1\u0ccd \u0cb5\u0cbf\u0cb5\u0cb0\u0cbf\u0cb8\u0cbf', generateResume: '\u0cb0\u0cc6\u0cb8\u0ccd\u0caf\u0cc2\u0cae\u0ccd \u0cb0\u0c9a\u0cbf\u0cb8\u0cbf',
    snippets: '\u0cb8\u0ccd\u0ca8\u0cbf\u0caa\u0cc6\u0c9f\u0ccd\u0cb8\u0ccd'
  }
};

const defaultContextValue = {
  lang: 'en',
  changeLang: () => {},
  t: (key) => translations['en']?.[key] || key
};

const LanguageContext = createContext(defaultContextValue);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('pyai_lang') || 'en');
  const changeLang = (newLang) => { setLang(newLang); localStorage.setItem('pyai_lang', newLang); };
  const t = (key) => translations[lang]?.[key] || translations['en'][key] || key;
  return <LanguageContext.Provider value={{ lang, changeLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { 
  const context = useContext(LanguageContext);
  return context || defaultContextValue; 
}
export default LanguageContext;


import React, { useState } from 'react';
import { Screen, Language, UserProfile } from './types';
import LevelSelection from './components/LevelSelection';
import FormulaPractice from './components/FormulaPractice';
import EquationBalancer from './components/EquationBalancer';
import EquationBuilder from './components/EquationBuilder';
import LoginScreen from './components/LoginScreen';

const STORAGE_KEY = 'chemistry_master_users_v1';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [language, setLanguage] = useState<Language>('ZH');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const getUsers = (): Record<string, UserProfile> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("LocalStorage Error:", e);
      return {};
    }
  };

  const saveUser = (user: UserProfile) => {
    const users = getUsers();
    users[user.name] = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  };

  const handleLogin = (name: string) => {
    const users = getUsers();
    let user = users[name];

    if (!user) {
      user = {
        name,
        progress: { level1MaxStage: 3 }, // 初始開放前三個階段
        challengeAttempts: 3
      };
      saveUser(user);
    } 

    setCurrentUser(user);
    setCurrentScreen(Screen.HOME);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen(Screen.HOME);
  };

  const handleProgressUpdate = (newMaxStage: number) => {
    if (!currentUser) return;
    if (newMaxStage > currentUser.progress.level1MaxStage) {
      const updatedUser: UserProfile = {
        ...currentUser,
        progress: { ...currentUser.progress, level1MaxStage: newMaxStage }
      };
      setCurrentUser(updatedUser);
      saveUser(updatedUser);
    }
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
      setCurrentUser(updatedUser);
      saveUser(updatedUser);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} language={language} setLanguage={setLanguage} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/50 text-slate-900">
      <main className="container mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
        {currentScreen === Screen.HOME && (
          <LevelSelection 
            onSelectScreen={setCurrentScreen} 
            language={language}
            setLanguage={setLanguage}
            user={currentUser}
            onLogout={handleLogout}
          />
        )}
        
        {currentScreen === Screen.LEVEL_1 && (
          <FormulaPractice 
            onBack={() => setCurrentScreen(Screen.HOME)} 
            language={language}
            user={currentUser}
            onUserUpdate={handleUserUpdate}
            onProgressUpdate={handleProgressUpdate}
          />
        )}
        
        {currentScreen === Screen.LEVEL_2 && <EquationBalancer onBack={() => setCurrentScreen(Screen.HOME)} language={language} />}
        {currentScreen === Screen.LEVEL_3 && <EquationBuilder onBack={() => setCurrentScreen(Screen.HOME)} language={language} />}
      </main>
      <footer className="fixed bottom-0 w-full p-4 text-center text-slate-400 text-[10px] pointer-events-none bg-white/50 backdrop-blur-sm z-50">
        Chemistry Master | Powered by Gemini 3 | User: {currentUser.name}
      </footer>
    </div>
  );
};

export default App;

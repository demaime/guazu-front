class ThemeService {
  constructor() {
    this.THEME_KEY = 'theme-preference';
    
    // Verificar si hay un tema guardado al iniciar
    if (typeof window !== 'undefined') {
      const savedTheme = this.getTheme();
      this.applyTheme(savedTheme);
    }
  }

  getTheme() {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem(this.THEME_KEY) || 'light';
  }

  setTheme(theme) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    if (typeof window === 'undefined') return;
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }

  initTheme() {
    const savedTheme = this.getTheme();
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const currentTheme = this.getTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
    return newTheme;
  }
}

export const themeService = new ThemeService(); 
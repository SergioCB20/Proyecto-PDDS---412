export const auth = {
  getToken: () => null,

  logout: () => {
    localStorage.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },
};

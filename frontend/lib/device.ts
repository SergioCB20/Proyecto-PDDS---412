export const device = {
  getId: (): string => {
    if (typeof window === 'undefined') return 'server';
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  },

  getNodoRefId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('nodo_ref_id');
  },

  setNodoRefId: (id: string) => {
    localStorage.setItem('nodo_ref_id', id);
  },
};

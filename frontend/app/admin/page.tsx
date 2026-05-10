'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit2, UserX, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Usuario, PageResponse, Rol } from '@/lib/types';

const ROLES: Rol[] = ['ADMINISTRADOR', 'OPERADOR_LOGISTICO', 'ANALISTA'];

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);

  const [form, setForm] = useState({ nombre: '', correo: '', password: '', rol: 'OPERADOR_LOGISTICO' as Rol });
  const [editForm, setEditForm] = useState({ nombre: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PageResponse<Usuario>>(`/usuarios?page=${page}&size=10`);
      setUsuarios(res.content);
      setTotal(res.totalElements);
      setTotalPages(res.totalPages);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const filtered = search
    ? usuarios.filter(
        (u) =>
          u.nombre.toLowerCase().includes(search.toLowerCase()) ||
          u.correo.toLowerCase().includes(search.toLowerCase())
      )
    : usuarios;

  const openCreate = () => {
    setForm({ nombre: '', correo: '', password: '', rol: 'OPERADOR_LOGISTICO' });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setSelectedUser(u);
    setEditForm({ nombre: u.nombre });
    setFormError('');
    setEditModalOpen(true);
  };

  const openDelete = (u: Usuario) => {
    setSelectedUser(u);
    setDeleteModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      await api.post('/usuarios', form);
      setModalOpen(false);
      fetchUsuarios();
    } catch (err: unknown) {
      const apiErr = err as { mensaje?: string };
      setFormError(apiErr.mensaje || 'Error al crear usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError('');
    try {
      await api.put(`/usuarios/${selectedUser.id}`, editForm);
      setEditModalOpen(false);
      fetchUsuarios();
    } catch (err: unknown) {
      const apiErr = err as { mensaje?: string };
      setFormError(apiErr.mensaje || 'Error al actualizar usuario');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleEstado = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      const nuevoEstado = selectedUser.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await api.patch(`/usuarios/${selectedUser.id}/estado`, { estado: nuevoEstado });
      setDeleteModalOpen(false);
      fetchUsuarios();
    } catch (err: unknown) {
      const apiErr = err as { mensaje?: string };
      setFormError(apiErr.mensaje || 'Error al cambiar estado');
    } finally {
      setFormLoading(false);
    }
  };

  const estadoBadge = (estado?: string) => {
    if (estado === 'ACTIVO') return <Badge variant="green">Activo</Badge>;
    if (estado === 'INACTIVO') return <Badge variant="red">Inactivo</Badge>;
    return null;
  };

  const rolBadge = (rol: string) => {
    const map: Record<string, 'blue' | 'yellow' | 'green'> = {
      ADMINISTRADOR: 'blue',
      OPERADOR_LOGISTICO: 'yellow',
      ANALISTA: 'green',
    };
    return <Badge variant={map[rol] || 'default'}>{rol.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Administracion de Usuarios
        </h1>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                <th className="px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Nombre</th>
                <th className="px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Correo</th>
                <th className="px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Rol</th>
                <th className="px-5 py-3 font-medium text-slate-600 dark:text-slate-400">Estado</th>
                <th className="px-5 py-3 font-medium text-slate-600 dark:text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No hay usuarios</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">{u.nombre}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{u.correo}</td>
                    <td className="px-5 py-3">{rolBadge(u.rol)}</td>
                    <td className="px-5 py-3">{estadoBadge(u.estado)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => openDelete(u)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                          title={u.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                        >
                          {u.estado === 'ACTIVO' ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500">
              {total} usuarios — pagina {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Crear Usuario"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading ? 'Creando...' : 'Crear'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Input label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <Input label="Correo" type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
          <Input label="Contrasena" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Rol</label>
            <select
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Editar: ${selectedUser?.nombre}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Input label="Nombre" value={editForm.nombre} onChange={(e) => setEditForm({ nombre: e.target.value })} required />
        </form>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={selectedUser?.estado === 'ACTIVO' ? 'Inactivar Usuario' : 'Activar Usuario'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleToggleEstado} disabled={formLoading}>
              {formLoading ? 'Procesando...' : selectedUser?.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
            </Button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-400">
          {selectedUser?.estado === 'ACTIVO'
            ? `Esta seguro que desea inactivar a ${selectedUser?.nombre}?`
            : `Esta seguro que desea activar a ${selectedUser?.nombre}?`}
        </p>
      </Modal>
    </div>
  );
}
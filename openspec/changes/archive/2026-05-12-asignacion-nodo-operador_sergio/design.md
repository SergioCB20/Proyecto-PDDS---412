# Design: Asignacion de Nodo a Operadores

## Backend: DataSeeder

En `DataSeeder.java`, crear el usuario operador con el nodo LIM asignado:

```java
Usuario operador = new Usuario(
    UUID.fromString("00000000-0000-0000-0001-000000000002"),
    operadorRol, "Operador Lima", "operador@tasfb2b.com",
    passwordEncoder.encode("operador123")
);
operador.setNodoRefId(lim.getId()); // Asignar nodo LIM
usuarioRepository.save(operador);
```

El nodo LIM debe existir previamente en la variable `lim` que se crea en el metodo `seedBC1()`.

## Frontend: Admin - Selector de Nodos

En `app/admin/page.tsx`:

1. Estado para el nodo:
```typescript
const [form, setForm] = useState({
  nombre: '', correo: '', password: '',
  rol: 'OPERADOR_LOGISTICO' as Rol,
  nodo_ref_id: ''
});
```

2. Cargar nodos al montar (useEffect):
```typescript
const [nodos, setNodos] = useState<Nodo[]>([]);
useEffect(() => {
  api.get<Nodo[]>('/nodos').then(setNodos).catch(() => {});
}, []);
```

3. Mostrar selector solo si rol === 'OPERADOR_LOGISTICO':
```tsx
{form.rol === 'OPERADOR_LOGISTICO' && (
  <select
    value={form.nodo_ref_id}
    onChange={(e) => setForm({...form, nodo_ref_id: e.target.value})}
  >
    <option value="">Seleccionar nodo</option>
    {nodos.map(n => <option key={n.id} value={n.id}>{n.codigo_iata} - {n.nombre}</option>)}
  </select>
)}
```

## Fix: Filtro de nulos (ya aplicado)

En `app/operacion/page.tsx:129`:

```typescript
// Antes (error):
const destinoOptions = nodos.map(n => ({ value: n.codigo_iata, label: n.codigo_iata })).sort(...)

// Despues (fix aplicado):
const destinoOptions = nodos.filter(n => n.codigo_iata).map(n => ({ value: n.codigo_iata, label: n.codigo_iata })).sort(...)
```

El filtro evita que nodos con codigo_iata null/undefined causen TypeError en localeCompare.
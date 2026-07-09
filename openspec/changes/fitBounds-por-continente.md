# Filtro por continente -> move + zoom el mapa

> Objetivo: cuando el usuario selecciona un continente en el `<Select>` del panel "Aeropuertos"
> del dashboard (OperacionView / SimulacionView / ColapsoView), el mapa hace fitBounds a los
> aeropuerts de ese continente (padding [50,50], duration: 1s). Al limpiar el filtro,
> flyTo al centro global del mundo. Si solo hay 1 aeropuert en el continente, flyTo
> con zoom 7 (los fitBounds sobre 1 punto sobre-zoomean a maxZoom=18).
> Duracion: 0.5 dia

---

## Tareas Completadas

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 1 | Lift state `filtroContinente*` a las 3 vistas (Op/Sim/Col) | `frontend/app/page.tsx` | OK |
| 2 | Fix brecha: `continente` faltante en `aeropuertosMapa` de Sim y Col | `frontend/app/page.tsx` | OK |
| 3 | Convertir `PanelAeropuertosOperacion` a controlado (fallback interno) | `frontend/components/operacion/PanelAeropuertosOperacion.tsx` | OK |
| 4 | Propagar props desde `PanelTabs` | `frontend/components/shared/PanelTabs.tsx` | OK |
| 5 | Nueva prop `continenteFiltro` en `GeoMapa` + `useEffect` con `previousContinente` ref en `MapController` | `frontend/components/mapa/GeoMapa.tsx` | OK |

---

## Detalle de cambios

### Lift state a la vista

Cada vista (`OperacionView`, `SimulacionView`, `ColapsoView`) ahora declara:

```tsx
const [filtroContinenteOp, setFiltroContinenteOp] = useState<string>('');
```

y la propaga a:
- `<PanelTabs filtroContinente={filtroContinenteOp} onFiltroContinenteChange={setFiltroContinenteOp} />`
- `<GeoMapa continenteFiltro={filtroContinenteOp || undefined} />`

Esto es necesario porque el filtro vive dentro de `PanelAeropuertosOperacion`, que
vive dentro de `<PanelTabs>` y nunca antes alcanzaba `GeoMapa`/`MapController`.

### Fix de brecha: `continente` en `SimulacionView` y `ColapsoView`

La build paralela `aeropuertosMapa` de `SimulacionView` (page.tsx:1456-1473)
y `ColapsoView` (page.tsx:2454-2471) **nunca seteaban `continente`** en el mapeo
del payload WS. Sin esto, el dropdown solo ofrecía un valor sintético en blanco
y `MapController` no encontraba coincidencias. Ahora ambos incluyen
`continente: n.continente` (igual que `OperacionView` ya hacía en L381).

### `PanelAeropuertosOperacion` controlado (con fallback)

Antes: state interno `useState('')`. Ahora controlable por props:

```tsx
interface PanelAeropuertosOperacionProps {
  ...
  filtroContinente?: string;
  onFiltroContinenteChange?: (continente: string) => void;
}

const [filtroContinenteInterno, setFiltroContinenteInterno] = useState('');
const continenteActual = filtroContinente ?? filtroContinenteInterno;
const onContinenteChange = (v: string) => {
  if (onFiltroContinenteChange) onFiltroContinenteChange(v);
  else setFiltroContinenteInterno(v);
};
```

Default al state interno si el padre no controla — mantiene el componente
utilisable en aislamiento pero las 3 vistas del dashboard siempre pasan props.

### `MapController` useEffect de fitBounds por continente

Nuevo useEffect en `frontend/components/mapa/GeoMapa.tsx`:

```tsx
const previousContinente = useRef<string | null>(null);
useEffect(() => {
  const previo = previousContinente.current;
  if (previo === continenteFiltro) return;

  if (continenteFiltro) {
    const coords = aeropuertos
      .filter((a) => (a.continente || a.zona_horaria) === continenteFiltro)
      .map<[number, number]>((a) => [a.latitud, a.longitud]);
    if (coords.length === 1) {
      // fitBounds sobre 1 punto sobre-zoomea a maxZoom=18.
      // Mismo nivel que el click-marker (Precedent en L63).
      map.flyTo(coords[0], 7, { duration: 1 });
    } else if (coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50], duration: 1 });
    }
  } else if (previo) {
    // Filtro limpiado (prev != null): volver a la vista global.
    map.flyTo(CENTRO, ZOOM, { duration: 0.8 });
  }

  previousContinente.current = continenteFiltro ?? null;
}, [continenteFiltro, aeropuertos, map]);
```

`previousContinente` previene re-entradas en cada rerender. Gana siempre sobre el
seguimiento activo — la decision explicita del usuario al elegir continente
reubica la camara (aun si `seguidoVueloId` o `seguidoAeropuertoId` estan prendidos).

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/app/page.tsx` | +3 `useState` (uno por vista) + props a `<PanelTabs>` y `<GeoMapa>`; +2 lineas `continente: n.continente` en Sim/Col prompts |
| `frontend/components/shared/PanelTabs.tsx` | +2 props + destructuring + paso a `PanelAeropuertosOperacion` |
| `frontend/components/operacion/PanelAeropuertosOperacion.tsx` | `filtroContinente` controlado + fix bug preexistente `onFilterColorChange` no se destructuraba |
| `frontend/components/mapa/GeoMapa.tsx` | +prop `continenteFiltro` en `GeoMapaProps` y `MapControllerProps`; +`useEffect` en `MapController`; +paso de prop al montar `<MapController>` |

---

## Como probar

1. **OperacionView**: abrir panel Aeropuertos. Filtro "Continente" ofrece varios. Selecciona uno -> mapa hace fitBounds a sus aeropuerts; al limpiarlo, vista global.
2. **SimulacionView**: iniciar sesion. Esperar al menos un tick para que `telemetria.nodos` traiga `continente`. Repetir.
3. **Continente con un solo aeropuert** (Oceania = 1 aeropuert): el fitBounds no se dispara; el mapa usa `flyTo(coords[0], 7)`. Verifica que el zoom no satura hasta nivel 18.
4. **Caso extremo**: arrancar sesion sin WS aun -> la lista de continentes puede estar incompleta. Esperar al WS.

---

## Notas / limites

- El fitBounds aplica sobre TODOS los aeropuerts cargados en `aeropuertos` (no solo los filtrados por el panel). Esto es intencional: si la simulacion agrego 30 aeropuerts pero el panel filtro a 6, fitBounds sigue mirando los 30 para situar la camara. Si se prefiere fitBounds solo al set filtrado visible en el panel, hay que lift el set filtrado a la vista y pasarlo a `GeoMapa` — fuera de este cambio.
- Las props nuevas en el panel (`filtroContinente`, `onFiltroContinenteChange`) son opcionales: si no se pasan el componente cae al state interno. Asi no rompe usos en aislamiento (no hay otros hoy pero el contrato queda backward-compat).
- El bug preexistente `onFilterColorChange` en `PanelAeropuertosOperacion` (declarada en interface pero no destructuring) se aprovecha para arreglarlo en este cambio.

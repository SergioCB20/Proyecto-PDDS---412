## 1. Types & API Layer

- [ ] 1.1 Agregar interface `EnvioEntregadoResponse` en `frontend/lib/types.ts`
- [ ] 1.2 Agregar función `fetchEntregadosRecientes()` en `frontend/lib/api.ts`

## 2. Componente PanelEntregados

- [ ] 2.1 Crear `frontend/components/simulacion/PanelEntregados.tsx` con props `sesionId`
- [ ] 2.2 Implementar fetch al endpoint con loading/error/data states
- [ ] 2.3 Implementar polling automático cada 5s mientras estado sea `EN_CURSO`
- [ ] 2.4 Renderizar lista con `origen_iata → destino_iata`, `codigo_vuelo`, `cantidad`

## 3. Integración en página

- [ ] 3.1 Importar y renderizar `<PanelEntregados />` en `simulacion/[id]/page.tsx`
- [ ] 3.2 Verificar que el polling se detiene al finalizar la sesión

## 4. Verificación

- [ ] 4.1 Compilar frontend con `npx tsc --noEmit`
- [ ] 4.2 Verificar que el componente se renderiza correctamente en el sidebar

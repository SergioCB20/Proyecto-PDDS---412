# Mock Data Spec

## Status: PARA DESARROLLO SIN BC2

## Nodos (posiciones reales)

| codigo_iata | nombre | latitud | longitud | capacidad |
|-------------|--------|---------|----------|-----------|
| LIM | Aeropuerto Jorge Chavez | -12.0219 | -77.1143 | 500 |
| MIA | Miami International | 25.7959 | -80.2870 | 800 |
| BOG | El Dorado | 4.7016 | -74.1469 | 600 |
| GRU | Sao Paulo Guarulhos | -23.4356 | -46.4731 | 700 |
| SCL | Arturo Merino Benitez | -33.3930 | -70.7858 | 400 |

## Vuelos Simulacion

10 vuelos entre los 5 nodos. Cada vuelo tiene:
- posision inicial en origen
- interpolacion lineal hacia destino segun progreso
- avion posicionado en el punto correspondiente

## Metric as Simuladas

En modo simulacion:
- `dia_hora_virtual`: avanza 1 dia por cada 10 segundos reales
- `sla_acumulado_pct`: empieza en 100%, baja segun cancelaciones
- `vuelos_cancelados`: increment a segun prob_cancelacion
- `maletas_replanificadas`: proporcional a vuelos cancelados
- `segundos_reales_transcurridos`: contador simple

## Hook useMetricasMock

```typescript
function useMetricasMock(sesionId: string, activa: boolean, probCancelacion: number) {
  // Retorna MetricasEnVivo simuladas
  // Actualiza cada 3 segundos
  // Disminuye SLA al azar segun probCancelacion
}
```

## Hook useVuelosAnimados

```typescript
function useVuelosAnimados(vuelos: Vuelo[], activo: boolean) {
  // Retorna posicion actual de cada avion
  // Interpolacion entre origen y destino segun timestamp
  // Solo se actualiza cuando activo = true
}
```
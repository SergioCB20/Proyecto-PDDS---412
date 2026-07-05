package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * Ocupación de almacén de un nodo en un contexto dado (operación día a día vs. una sesión de
 * simulación concreta). Sustituye al contador global nodos_logisticos.ocupacion_actual, que
 * era compartido por ambos modos. La columna sesion_id identifica el contexto:
 * {@link com.tasfb2b.backend.bc1.application.OcupacionNodoService#OPERACION} para la operación,
 * el id de la sesión para cada simulación.
 */
@Entity
@Table(name = "ocupacion_nodo",
       uniqueConstraints = @UniqueConstraint(name = "uk_ocupacion_nodo_ctx",
               columnNames = {"nodo_id", "sesion_id"}))
public class OcupacionNodo {

    @Id
    private UUID id;

    @Column(name = "nodo_id", nullable = false)
    private UUID nodoId;

    @Column(name = "sesion_id", nullable = false)
    private UUID sesionId;

    @Column(nullable = false)
    private int ocupacion;

    public OcupacionNodo() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getNodoId() { return nodoId; }
    public void setNodoId(UUID nodoId) { this.nodoId = nodoId; }

    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }

    public int getOcupacion() { return ocupacion; }
    public void setOcupacion(int ocupacion) { this.ocupacion = ocupacion; }
}

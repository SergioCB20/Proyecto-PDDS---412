package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc2.domain.EquipajeSimulado;
import com.tasfb2b.backend.bc2.infrastructure.EquipajeSimuladoRepository;
import com.tasfb2b.backend.shared.events.EquipajeIngresadoEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SimuladorBaggageFeeder {

    private static final Logger log = LoggerFactory.getLogger(SimuladorBaggageFeeder.class);

    private final EquipajeSimuladoRepository equipajeSimuladoRepository;
    private final EquipajeRepository equipajeRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SimuladorBaggageFeeder(EquipajeSimuladoRepository equipajeSimuladoRepository,
                                  EquipajeRepository equipajeRepository,
                                  ApplicationEventPublisher eventPublisher) {
        this.equipajeSimuladoRepository = equipajeSimuladoRepository;
        this.equipajeRepository = equipajeRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void alimentarMotor(UUID sesionId, OffsetDateTime diaHoraVirtual) {
        List<EquipajeSimulado> pendientes = equipajeSimuladoRepository
                .findBySesionIdAndFechaIngresoVirtualLessThanEqualAndProcesadoFalse(sesionId, diaHoraVirtual);

        if (pendientes.isEmpty()) {
            return;
        }

        log.info("SimuladorBaggageFeeder: Encontrados {} equipajes para ingresar en tick virtual {}", pendientes.size(), diaHoraVirtual);

        List<Equipaje> nuevosEquipajes = pendientes.stream().map(sim -> {
            Equipaje eq = new Equipaje();
            eq.setId(sim.getId());
            eq.setDestinoIata(sim.getDestinoIata());
            eq.setSlaComprometido(sim.getSlaComprometido());
            eq.setCantidad(sim.getCantidad());
            eq.setEstado(EstadoEquipaje.REGISTRADO);
            eq.setFechaIngreso(sim.getFechaIngresoVirtual());
            return eq;
        }).collect(Collectors.toList());

        equipajeRepository.saveAll(nuevosEquipajes);

        List<UUID> ids = pendientes.stream().map(EquipajeSimulado::getId).collect(Collectors.toList());
        
        // Marcamos en lotes de 1000 por seguridad (aunque JPA o Hibernate podrían optimizar esto en In-Clause si está habilitado)
        for(int i = 0; i < ids.size(); i += 1000) {
            int end = Math.min(ids.size(), i + 1000);
            equipajeSimuladoRepository.marcarComoProcesados(ids.subList(i, end));
        }

        // Emitimos el evento por cada equipaje insertado para que BC2 procese el enrutamiento.
        // MotorEnrutamiento escucha EquipajeIngresadoEvent y crea PlanViaje.
        for (Equipaje eq : nuevosEquipajes) {
            eventPublisher.publishEvent(new EquipajeIngresadoEvent(eq.getId(), OffsetDateTime.now()));
        }

        log.info("SimuladorBaggageFeeder: {} equipajes inyectados y eventos publicados", pendientes.size());
    }
}

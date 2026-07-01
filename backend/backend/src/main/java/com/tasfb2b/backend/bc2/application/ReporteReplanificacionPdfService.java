package com.tasfb2b.backend.bc2.application;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.domain.EventoCancelacion;
import com.tasfb2b.backend.bc2.domain.ItemLote;
import com.tasfb2b.backend.bc2.domain.LoteReplanificacion;
import com.tasfb2b.backend.bc2.infrastructure.EventoCancelacionRepository;
import com.tasfb2b.backend.bc2.infrastructure.ItemLoteRepository;
import com.tasfb2b.backend.bc2.infrastructure.LoteReplanificacionRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class ReporteReplanificacionPdfService {

    private final LoteReplanificacionRepository loteRepository;
    private final EventoCancelacionRepository eventoRepository;
    private final VueloRepository vueloRepository;
    private final ItemLoteRepository itemLoteRepository;
    private final EquipajeRepository equipajeRepository;

    public ReporteReplanificacionPdfService(LoteReplanificacionRepository loteRepository,
                                            EventoCancelacionRepository eventoRepository,
                                            VueloRepository vueloRepository,
                                            ItemLoteRepository itemLoteRepository,
                                            EquipajeRepository equipajeRepository) {
        this.loteRepository = loteRepository;
        this.eventoRepository = eventoRepository;
        this.vueloRepository = vueloRepository;
        this.itemLoteRepository = itemLoteRepository;
        this.equipajeRepository = equipajeRepository;
    }

    public byte[] generarPdf(UUID sesionId, UUID loteId) {
        LoteReplanificacion lote = loteRepository.findById(loteId)
                .orElseThrow(() -> new IllegalArgumentException("Lote no encontrado: " + loteId));
        if (!lote.getSesionId().equals(sesionId)) {
            throw new IllegalArgumentException("El lote no pertenece a la sesion indicada");
        }

        EventoCancelacion evento = eventoRepository.findById(lote.getEventoId())
                .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado"));
        Vuelo vuelo = vueloRepository.findById(evento.getVueloRefId())
                .orElseThrow(() -> new IllegalArgumentException("Vuelo no encontrado"));
        List<ItemLote> items = itemLoteRepository.findByLoteId(loteId);
        List<Equipaje> equipajes = equipajeRepository.findAllById(
                items.stream().map(ItemLote::getEquipajeRefId).toList());

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm 'UTC'");
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font tituloFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            document.add(new Paragraph("REPORTE DE REPLANIFICACION", tituloFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Vuelo cancelado: " + vuelo.getCodigoVuelo(), headerFont));
            document.add(new Paragraph("Ruta: " + (vuelo.getOrigen() != null ? vuelo.getOrigen().getCodigoIata() : "?")
                    + " → " + (vuelo.getDestino() != null ? vuelo.getDestino().getCodigoIata() : "?"), normalFont));
            document.add(new Paragraph("Causa: " + (evento.getCausa() != null ? evento.getCausa() : "No especificada"), normalFont));
            document.add(new Paragraph("Fecha del evento: " + (evento.getOcurridoEnVirtual() != null
                    ? evento.getOcurridoEnVirtual().format(fmt) : "N/A"), normalFont));
            document.add(new Paragraph("Fecha del reporte: " + java.time.OffsetDateTime.now().format(fmt), normalFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Equipajes afectados (" + equipajes.size() + ")", headerFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1, 3, 2, 2});

            for (String col : new String[]{"N°", "ID Equipaje", "Origen", "Destino"}) {
                PdfPCell cell = new PdfPCell(new Phrase(col, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            int i = 1;
            for (Equipaje eq : equipajes) {
                table.addCell(new PdfPCell(new Phrase(String.valueOf(i++), normalFont)));
                table.addCell(new PdfPCell(new Phrase(
                        eq.getIdExterno() != null ? eq.getIdExterno() : eq.getId().toString(), normalFont)));
                table.addCell(new PdfPCell(new Phrase(eq.getOrigenIata(), normalFont)));
                table.addCell(new PdfPCell(new Phrase(eq.getDestinoIata(), normalFont)));
            }

            document.add(table);
            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Error al generar PDF de replanificacion", e);
        }

        return baos.toByteArray();
    }
}

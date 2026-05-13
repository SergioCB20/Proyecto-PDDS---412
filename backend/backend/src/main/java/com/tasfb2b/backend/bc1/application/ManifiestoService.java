package com.tasfb2b.backend.bc1.application;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class ManifiestoService {

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;

    public ManifiestoService(VueloRepository vueloRepository, EquipajeRepository equipajeRepository) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
    }

    public byte[] generarManifiesto(UUID vueloId) {
        Vuelo vuelo = vueloRepository.findById(vueloId)
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + vueloId));

        List<Equipaje> equipajes = equipajeRepository.findByVueloActualId(vueloId);
        if (equipajes.isEmpty()) {
            throw new ManifiestoVacioException("El vuelo " + vuelo.getCodigoVuelo() + " no tiene equipajes asignados");
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm 'UTC'");

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font tituloFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            document.add(new Paragraph("MANIFIESTO DE VUELO", tituloFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Código de vuelo: " + vuelo.getCodigoVuelo(), headerFont));
            document.add(new Paragraph("Estado: " + vuelo.getEstado().name(), normalFont));
            document.add(new Paragraph("Origen: " + vuelo.getOrigen().getNombre() + " (" + vuelo.getOrigen().getCodigoIata() + ")", normalFont));
            document.add(new Paragraph("Destino: " + vuelo.getDestino().getNombre() + " (" + vuelo.getDestino().getCodigoIata() + ")", normalFont));
            document.add(new Paragraph("Salida: " + vuelo.getHoraSalida().format(fmt), normalFont));
            document.add(new Paragraph("Llegada: " + vuelo.getHoraLlegada().format(fmt), normalFont));
            document.add(new Paragraph("Capacidad: " + vuelo.getCapacidadCarga() + " | Disponible: " + vuelo.getCargaDisponible(), normalFont));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1, 3, 2, 2, 3});

            for (String col : new String[]{"N°", "ID Equipaje", "Destino", "Estado", "SLA Comprometido"}) {
                PdfPCell cell = new PdfPCell(new Phrase(col, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            int i = 1;
            for (Equipaje eq : equipajes) {
                table.addCell(new PdfPCell(new Phrase(String.valueOf(i++), normalFont)));
                table.addCell(new PdfPCell(new Phrase(eq.getIdExterno() != null ? eq.getIdExterno() : eq.getId().toString(), normalFont)));
                table.addCell(new PdfPCell(new Phrase(eq.getDestinoIata(), normalFont)));
                table.addCell(new PdfPCell(new Phrase(eq.getEstado().name(), normalFont)));
                table.addCell(new PdfPCell(new Phrase(eq.getSlaComprometido().format(fmt), normalFont)));
            }

            document.add(table);
            document.add(new Paragraph(" "));
            document.add(new Paragraph("Total equipajes: " + equipajes.size(), headerFont));

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Error al generar el PDF", e);
        }

        return baos.toByteArray();
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class ManifiestoVacioException extends RuntimeException {
        public ManifiestoVacioException(String msg) { super(msg); }
    }
}

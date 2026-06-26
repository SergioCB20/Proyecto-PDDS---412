package com.tasfb2b.backend.bc1.application;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class PlanViajePdfService {

    private final EquipajeService equipajeService;

    public PlanViajePdfService(EquipajeService equipajeService) {
        this.equipajeService = equipajeService;
    }

    public byte[] generarPdf(UUID equipajeId) {
        EquipajeService.PlanViajeDetalleResponse detalle = equipajeService.obtenerDetallePlanViaje(equipajeId);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm 'UTC'");

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font tituloFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);

            document.add(new Paragraph("PLAN DE VIAJE", tituloFont));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Código de equipaje: " + detalle.equipaje_id(), labelFont));
            document.add(new Paragraph(" "));

            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{1, 2});

            String sla = "EN_TIEMPO".equals(detalle.estado_sla()) ? "En tiempo" : "Incumplimiento SLA";
            addInfoRow(infoTable, "Estado", detalle.estado(), normalFont, labelFont);
            addInfoRow(infoTable, "Estado SLA", sla, normalFont, labelFont);
            addInfoRow(infoTable, "Tiempo estimado entrega",
                    detalle.tiempo_entrega_est() != null
                            ? detalle.tiempo_entrega_est().format(fmt)
                            : "—",
                    normalFont, labelFont);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            List<EquipajeService.SegmentoResponse> segmentos = detalle.segmentos();

            if (segmentos == null || segmentos.isEmpty()) {
                document.add(new Paragraph("Sin segmentos registrados", normalFont));
            } else {
                document.add(new Paragraph("RUTA DEL EQUIPAJE", headerFont));
                document.add(new Paragraph(" "));

                PdfPTable table = new PdfPTable(4);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1, 3, 3, 3});

                for (String col : new String[]{"Orden", "Vuelo", "Tramo", "Hora salida"}) {
                    PdfPCell cell = new PdfPCell(new Phrase(col, headerFont));
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    table.addCell(cell);
                }

                for (EquipajeService.SegmentoResponse seg : segmentos) {
                    table.addCell(new PdfPCell(new Phrase(String.valueOf(seg.orden()), normalFont)));
                    table.addCell(new PdfPCell(new Phrase(seg.vuelo_codigo(), normalFont)));
                    table.addCell(new PdfPCell(new Phrase(
                            seg.nodo_origen() + " → " + seg.nodo_destino(), normalFont)));
                    table.addCell(new PdfPCell(new Phrase(
                            seg.hora_salida_prog() != null
                                    ? seg.hora_salida_prog().format(fmt)
                                    : "—",
                            normalFont)));
                }

                document.add(table);
                document.add(new Paragraph(" "));
                document.add(new Paragraph("Total segmentos: " + segmentos.size(), headerFont));
            }

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Error al generar el PDF del plan de viaje", e);
        }

        return baos.toByteArray();
    }

    private void addInfoRow(PdfPTable table, String label, String value, Font normalFont, Font labelFont) {
        table.addCell(new PdfPCell(new Phrase(label, labelFont)));
        table.addCell(new PdfPCell(new Phrase(value != null ? value : "—", normalFont)));
    }
}

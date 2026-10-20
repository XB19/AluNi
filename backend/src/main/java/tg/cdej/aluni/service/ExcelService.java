package tg.cdej.aluni.service;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import tg.cdej.aluni.common.ApiException;
import tg.cdej.aluni.dto.AdminDtos.ImportRow;
import tg.cdej.aluni.dto.AdminDtos.LabelValue;
import tg.cdej.aluni.dto.AdminDtos.ProfileRow;
import tg.cdej.aluni.dto.AdminDtos.Report;

@Service
public class ExcelService {

    private static final String[] IMPORT_HEADERS = { "Nom", "Prénom", "Date de naissance", "Sexe", "Téléphone", "E-mail" };
    private static final int MAX_ROWS = 1000;

    // ------------------------------------------------------------ Import des comptes

    public List<ImportRow> readUsers(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Aucun fichier reçu.");
        String ext = StorageService.extension(file.getOriginalFilename());
        try (InputStream in = file.getInputStream()) {
            List<String[]> lines = switch (ext) {
                case "xlsx", "xls" -> readWorkbook(in);
                case "csv" -> readCsv(in);
                default -> throw ApiException.badRequest("Format accepté : .xlsx ou .csv");
            };
            if (lines.size() > MAX_ROWS) throw ApiException.badRequest("Le fichier dépasse " + MAX_ROWS + " lignes.");
            List<ImportRow> rows = new ArrayList<>();
            for (int i = 0; i < lines.size(); i++) {
                String[] v = lines.get(i);
                String last = get(v, 0), first = get(v, 1), birth = get(v, 2), gender = get(v, 3), phone = get(v, 4), email = get(v, 5);
                if (String.join("", last, first, birth, gender, phone, email).isBlank()) continue;
                String error = null;
                LocalDate birthDate = null;
                if (last.isBlank() || first.isBlank()) error = "Nom et prénom obligatoires";
                if (!birth.isBlank()) {
                    birthDate = parseDate(birth);
                    if (birthDate == null && error == null) error = "Date de naissance invalide";
                }
                String g = gender.isBlank() ? null : gender.substring(0, 1).toUpperCase(Locale.ROOT);
                if (g != null && !g.equals("F") && !g.equals("M") && error == null) error = "Sexe : F ou M";
                rows.add(new ImportRow(i + 2, last.toUpperCase(Locale.FRENCH), capitalize(first), birthDate, g, phone, email, error));
            }
            return rows;
        } catch (IOException e) {
            throw ApiException.badRequest("Impossible de lire le fichier.");
        }
    }

    private static String get(String[] v, int i) {
        return i < v.length && v[i] != null ? v[i].trim() : "";
    }

    private static String capitalize(String s) {
        return s.isEmpty() ? s : s.substring(0, 1).toUpperCase(Locale.FRENCH) + s.substring(1).toLowerCase(Locale.FRENCH);
    }

    private static LocalDate parseDate(String s) {
        for (String pattern : List.of("dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yyyy")) {
            try {
                return LocalDate.parse(s, DateTimeFormatter.ofPattern(pattern));
            } catch (DateTimeParseException ignored) {
                // format suivant
            }
        }
        return null;
    }

    private List<String[]> readWorkbook(InputStream in) throws IOException {
        List<String[]> lines = new ArrayList<>();
        DataFormatter formatter = new DataFormatter(Locale.FRANCE);
        try (Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // en-têtes
                String[] values = new String[IMPORT_HEADERS.length];
                for (int c = 0; c < values.length; c++) {
                    Cell cell = row.getCell(c);
                    if (cell == null) values[c] = "";
                    else if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                        values[c] = cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate()
                                .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                    } else values[c] = formatter.formatCellValue(cell);
                }
                lines.add(values);
            }
        } catch (Exception e) {
            throw ApiException.badRequest("Fichier Excel illisible.");
        }
        return lines;
    }

    private List<String[]> readCsv(InputStream in) throws IOException {
        List<String[]> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null) return lines;
            String sep = header.contains(";") ? ";" : ",";
            String line;
            while ((line = reader.readLine()) != null) lines.add(line.split(sep, -1));
        }
        return lines;
    }

    public byte[] importTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Apprenants");
            CellStyle bold = headerStyle(wb);
            Row header = sheet.createRow(0);
            for (int i = 0; i < IMPORT_HEADERS.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(IMPORT_HEADERS[i]);
                c.setCellStyle(bold);
                sheet.setColumnWidth(i, 22 * 256);
            }
            Row example = sheet.createRow(1);
            String[] values = { "AMEVOR", "Kafui", "12/05/2009", "F", "90 12 34 56", "" };
            for (int i = 0; i < values.length; i++) example.createCell(i).setCellValue(values[i]);
            return bytes(wb);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    // ------------------------------------------------------------ Export des rapports

    public byte[] report(Report report, String period) {
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            CellStyle bold = headerStyle(wb);
            Sheet summary = wb.createSheet("Synthèse");
            int r = 0;
            Row title = summary.createRow(r++);
            title.createCell(0).setCellValue("Rapport ALuNI – " + period);
            title.getCell(0).setCellStyle(bold);
            r++;
            for (var e : report.stats().entrySet()) {
                Row row = summary.createRow(r++);
                row.createCell(0).setCellValue(ReportService.STAT_LABELS.getOrDefault(e.getKey(), e.getKey()));
                row.createCell(1).setCellValue(e.getValue() == null ? "—" : String.valueOf(e.getValue()));
            }
            summary.setColumnWidth(0, 34 * 256);
            summary.setColumnWidth(1, 16 * 256);

            writeTable(wb.createSheet("Inscriptions par mois"), bold, new String[] { "Mois", "Inscriptions" }, report.monthly());
            writeTable(wb.createSheet("Réussite par formation"), bold, new String[] { "Formation", "Taux de réussite (%)" },
                    report.successByCourse());

            Sheet profiles = wb.createSheet("Par type d'apprenant");
            String[] headers = { "Profil", "Inscrits", "Formations terminées", "Taux de réussite (%)", "Certificats" };
            Row h = profiles.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                h.createCell(i).setCellValue(headers[i]);
                h.getCell(i).setCellStyle(bold);
                profiles.setColumnWidth(i, 24 * 256);
            }
            int i = 1;
            for (ProfileRow p : report.byProfile()) {
                Row row = profiles.createRow(i++);
                row.createCell(0).setCellValue(p.label());
                row.createCell(1).setCellValue(p.learners());
                row.createCell(2).setCellValue(p.completed());
                row.createCell(3).setCellValue(p.successRate());
                row.createCell(4).setCellValue(p.certificates());
            }
            return bytes(wb);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void writeTable(Sheet sheet, CellStyle bold, String[] headers, List<LabelValue> rows) {
        Row h = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            h.createCell(i).setCellValue(headers[i]);
            h.getCell(i).setCellStyle(bold);
        }
        int i = 1;
        for (LabelValue lv : rows) {
            Row row = sheet.createRow(i++);
            row.createCell(0).setCellValue(lv.label());
            row.createCell(1).setCellValue(lv.value());
        }
        sheet.setColumnWidth(0, 40 * 256);
        sheet.setColumnWidth(1, 20 * 256);
    }

    private static CellStyle headerStyle(Workbook wb) {
        Font font = wb.createFont();
        font.setBold(true);
        CellStyle style = wb.createCellStyle();
        style.setFont(font);
        return style;
    }

    private static byte[] bytes(Workbook wb) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        return out.toByteArray();
    }
}

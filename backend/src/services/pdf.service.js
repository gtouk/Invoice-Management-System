import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import * as companySettingsRepository from '../modules/company-settings/companySettings.repository.js';

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatRate(value) {
  return Number(value || 0).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3
  });
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-CA');
}

function formatStatus(status) {
  const labels = {
    brouillon: 'Draft',
    non_payee: 'Unpaid',
    partiellement_payee: 'Partially paid',
    payee: 'Paid',
    annulee: 'Cancelled'
  };

  return labels[status] || status || '-';
}

function getBackendStoragePath(publicUrl) {
  if (!publicUrl) return null;

  const cleanPath = publicUrl.replace(/^\/+/, '');

  return path.resolve(process.cwd(), cleanPath);
}

function drawHorizontalLine(doc, y, color = '#E5E7EB') {
  doc
    .moveTo(45, y)
    .lineTo(550, y)
    .strokeColor(color)
    .lineWidth(1)
    .stroke();
}

function drawSectionTitle(doc, title, x, y) {
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111827')
    .text(title, x, y);

  return y + 20;
}

function getClientDisplayName(invoice) {
  if (invoice.client_type === 'entreprise') {
    return invoice.company_name || invoice.client_name || '-';
  }

  return invoice.client_name || '-';
}

function getClientEmail(invoice) {
  return invoice.billing_email || invoice.client_email || null;
}

function getClientPhone(invoice) {
  return invoice.billing_phone || invoice.client_phone || null;
}

function getClientAddress(invoice) {
  return invoice.billing_address || invoice.client_address || null;
}

function drawFooter(doc, settings) {
  const footerY = doc.page.height - 70;

  drawHorizontalLine(doc, footerY - 12);

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#6B7280')
    .text(
      settings?.invoice_footer_note || 'Thank you for your business.',
      45,
      footerY,
      {
        width: 505,
        align: 'center'
      }
    );
}

function drawCompanyHeader(doc, settings) {
  const logoPath = getBackendStoragePath(settings?.company_logo_url);

  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 45, 40, {
        fit: [85, 65],
        align: 'left',
        valign: 'center'
      });
    } catch {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text(settings?.company_name || 'Company', 45, 45, { width: 150 });
    }
  } else {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#111827')
      .text(settings?.company_name || 'Company', 45, 45, { width: 150 });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#111827')
    .text(settings?.company_name || 'Company', 150, 42, { width: 230 });

  let y = 68;

  if (settings?.company_address) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(settings.company_address, 150, y, {
        width: 230,
        lineGap: 1
      });

    y += 28;
  }

  const contacts = [
    settings?.company_phone,
    settings?.company_email
  ].filter(Boolean);

  if (contacts.length > 0) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(contacts.join(' | '), 150, y, { width: 300 });

    y += 15;
  }

  if (settings?.business_number) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(`Business No.: ${settings.business_number}`, 150, y, {
        width: 300
      });

    y += 12;
  }

  if (settings?.gst_hst_number) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(`GST/HST No.: ${settings.gst_hst_number}`, 150, y, {
        width: 300
      });

    y += 12;
  }

  if (settings?.qst_number) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(`QST No.: ${settings.qst_number}`, 150, y, {
        width: 300
      });
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#111827')
    .text('INVOICE', 430, 42, {
      width: 120,
      align: 'right'
    });

  drawHorizontalLine(doc, 135);
}

function drawInvoiceMeta(doc, invoice) {
  let y = 155;

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text('Invoice Details', 45, y);

  y += 18;

  const rows = [
    ['Invoice Number', invoice.invoice_number],
    ['Issue Date', formatDate(invoice.issue_date)],
    ['Due Date', formatDate(invoice.due_date)],
    ['Status', formatStatus(invoice.status)]
  ];

  for (const [label, value] of rows) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#6B7280')
      .text(label, 45, y, { width: 170 });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#111827')
      .text(String(value || '-'), 45, y + 10, { width: 170 });

    y += 30;
  }
}

function drawClientBlock(doc, invoice) {
  let y = 155;

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text('Bill To', 300, y);

  y += 18;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111827')
    .text(getClientDisplayName(invoice), 300, y, {
      width: 250
    });

  y += 18;

  if (invoice.client_type === 'entreprise' && invoice.contact_person_name) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(`Contact: ${invoice.contact_person_name}`, 300, y, {
        width: 250
      });

    y += 14;
  }

  const email = getClientEmail(invoice);
  const phone = getClientPhone(invoice);
  const address = getClientAddress(invoice);

  if (email) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(`Email: ${email}`, 300, y, { width: 250 });

    y += 14;
  }

  if (phone) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(`Phone: ${phone}`, 300, y, { width: 250 });

    y += 14;
  }

  if (address) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(address, 300, y, {
        width: 250,
        lineGap: 1
      });

    y += 30;
  }

  if (invoice.client_type === 'entreprise') {
    if (invoice.tax_number) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6B7280')
        .text(`Tax ID / Business No.: ${invoice.tax_number}`, 300, y, {
          width: 250
        });

      y += 12;
    }

    if (invoice.registration_number) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6B7280')
        .text(`Registration No.: ${invoice.registration_number}`, 300, y, {
          width: 250
        });

      y += 12;
    }

    if (invoice.national_id) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6B7280')
        .text(`National ID: ${invoice.national_id}`, 300, y, {
          width: 250
        });
    }
  }
}

function drawInvoiceTableHeader(doc, y) {
  doc
    .rect(45, y - 8, 505, 24)
    .fill('#F3F4F6');

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#111827');

  doc.text('Item / Service', 55, y, { width: 120 });
  doc.text('Description', 180, y, { width: 150 });
  doc.text('Qty', 340, y, { width: 40, align: 'right' });
  doc.text('Unit Price', 390, y, { width: 70, align: 'right' });
  doc.text('Total', 470, y, { width: 70, align: 'right' });

  return y + 28;
}

function drawItemsTable(doc, invoice, startY, settings) {
  let y = startY;

  y = drawSectionTitle(doc, 'Invoice Items', 45, y);
  y = drawInvoiceTableHeader(doc, y);

  for (const item of invoice.items || []) {
    if (y > 705) {
      drawFooter(doc, settings);
      doc.addPage();
      y = 55;
      y = drawInvoiceTableHeader(doc, y);
    }

    const rowStartY = y;

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#111827')
      .text(item.item_name || '-', 55, rowStartY, {
        width: 120
      });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#374151')
      .text(item.description || '-', 180, rowStartY, {
        width: 150,
        lineGap: 1
      });

    doc.text(formatMoney(item.quantity), 340, rowStartY, {
      width: 40,
      align: 'right'
    });

    doc.text(formatMoney(item.unit_price), 390, rowStartY, {
      width: 70,
      align: 'right'
    });

    doc
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text(formatMoney(item.line_total), 470, rowStartY, {
        width: 70,
        align: 'right'
      });

    y += 34;

    drawHorizontalLine(doc, y - 8);
  }

  return y + 18;
}

function drawTotals(doc, invoice, y) {
  if (y > 630) {
    doc.addPage();
    y = 55;
  }

  const labelX = 335;
  const valueX = 470;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#374151')
    .text('Subtotal', labelX, y, {
      width: 120,
      align: 'right'
    })
    .text(formatMoney(invoice.subtotal_amount), valueX, y, {
      width: 70,
      align: 'right'
    });

  y += 18;

  if (invoice.taxes_enabled) {
    if (Number(invoice.gst_hst_amount || 0) > 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#374151')
        .text(`GST/HST (${formatRate(invoice.gst_hst_rate)}%)`, labelX, y, {
          width: 120,
          align: 'right'
        })
        .text(formatMoney(invoice.gst_hst_amount), valueX, y, {
          width: 70,
          align: 'right'
        });

      y += 18;
    }

    if (Number(invoice.qst_amount || 0) > 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#374151')
        .text(`QST (${formatRate(invoice.qst_rate)}%)`, labelX, y, {
          width: 120,
          align: 'right'
        })
        .text(formatMoney(invoice.qst_amount), valueX, y, {
          width: 70,
          align: 'right'
        });

      y += 18;
    }

    if (Number(invoice.custom_tax_amount || 0) > 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#374151')
        .text(
          `${invoice.custom_tax_label || 'Tax'} (${formatRate(invoice.custom_tax_rate)}%)`,
          labelX,
          y,
          {
            width: 120,
            align: 'right'
          }
        )
        .text(formatMoney(invoice.custom_tax_amount), valueX, y, {
          width: 70,
          align: 'right'
        });

      y += 18;
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#111827')
      .text('Total Tax', labelX, y, {
        width: 120,
        align: 'right'
      })
      .text(formatMoney(invoice.tax_amount), valueX, y, {
        width: 70,
        align: 'right'
      });

    y += 18;
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#111827')
    .text('Total', labelX, y, {
      width: 120,
      align: 'right'
    })
    .text(formatMoney(invoice.total_amount), valueX, y, {
      width: 70,
      align: 'right'
    });

  y += 18;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#374151')
    .text('Paid', labelX, y, {
      width: 120,
      align: 'right'
    })
    .text(formatMoney(invoice.paid_amount), valueX, y, {
      width: 70,
      align: 'right'
    });

  y += 18;

  doc
    .rect(325, y - 6, 225, 26)
    .fill('#FEF3F2');

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#B42318')
    .text('Balance Due', labelX, y, {
      width: 120,
      align: 'right'
    })
    .text(formatMoney(invoice.balance_due), valueX, y, {
      width: 70,
      align: 'right'
    });

  return y + 45;
}

function drawBankDetails(doc, settings, y) {
  const hasBankInfo =
    settings?.bank_name ||
    settings?.bank_account_name ||
    settings?.bank_account ||
    settings?.bank_routing_number;

  if (!hasBankInfo) {
    return y;
  }

  if (y > 650) {
    doc.addPage();
    y = 55;
  }

  y = drawSectionTitle(doc, 'Payment Information', 45, y);

  const lines = [
    settings.bank_name ? `Bank: ${settings.bank_name}` : null,
    settings.bank_account_name
      ? `Account Name: ${settings.bank_account_name}`
      : null,
    settings.bank_account ? settings.bank_account : null,
    settings.bank_routing_number ? settings.bank_routing_number : null
  ].filter(Boolean);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#374151')
    .text(lines.join('\n'), 45, y, {
      width: 260,
      lineGap: 2
    });

  return y + lines.length * 14 + 25;
}

function drawNotes(doc, invoice, y) {
  if (!invoice.notes) return y;

  if (y > 670) {
    doc.addPage();
    y = 55;
  }

  y = drawSectionTitle(doc, 'Notes', 45, y);

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#374151')
    .text(invoice.notes, 45, y, {
      width: 505,
      lineGap: 2
    });

  return y + 55;
}

export async function generateInvoicePdf(invoice) {
  if (!invoice) {
    throw new Error('Facture introuvable pour la génération PDF.');
  }

  if (!invoice.company_id) {
    throw new Error('Entreprise introuvable pour la génération PDF.');
  }

  if (!invoice.invoice_number) {
    throw new Error(
      'La facture doit être générée officiellement avant de créer le PDF.'
    );
  }

  const settings = await companySettingsRepository.getCompanySettings(
    invoice.company_id
  );

  const storageDir = path.resolve(process.cwd(), 'storage', 'invoices');
  ensureDirectoryExists(storageDir);

  const fileName = `${invoice.invoice_number}.pdf`;
  const filePath = path.join(storageDir, fileName);
  const publicUrl = `/storage/invoices/${fileName}`;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 45
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  drawCompanyHeader(doc, settings);
  drawInvoiceMeta(doc, invoice);
  drawClientBlock(doc, invoice);

  drawHorizontalLine(doc, 295);

  let y = 320;

  y = drawItemsTable(doc, invoice, y, settings);
  y = drawTotals(doc, invoice, y);
  y = drawBankDetails(doc, settings, y);
  y = drawNotes(doc, invoice, y);

  drawFooter(doc, settings);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return {
    fileName,
    filePath,
    pdfUrl: publicUrl
  };
}
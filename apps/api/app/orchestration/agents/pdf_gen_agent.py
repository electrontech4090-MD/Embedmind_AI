import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_pdf_report(
    project_name: str, 
    req_doc: dict,
    hardware_design: dict | None,
    firmware_files: list,
    debug_findings: list = None
) -> bytes:
    """
    Generates a professional engineering PDF report from the project state.
    """
    requirement_summary = req_doc.get("summary", "")
    goals = req_doc.get("goals", [])
    constraints = req_doc.get("constraints", [])

    buffer = io.BytesIO()
    
    # 0.5 inch margins for professional layout density
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter, 
        rightMargin=36, 
        leftMargin=36, 
        topMargin=36, 
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom engineering document theme colors (Slate Navy #0B1020, Accent Blue #3B82F6)
    primary_color = colors.HexColor('#0B1020')
    secondary_color = colors.HexColor('#3B82F6')
    text_color = colors.HexColor('#1E293B')
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=primary_color,
        spaceAfter=10
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=text_color,
        leading=14,
        spaceAfter=6
    )
    
    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8,
        textColor=colors.HexColor('#0F172A'),
        leading=10,
        spaceAfter=4
    )

    story = []

    # Title block
    story.append(Paragraph(f"EmbedMind AI — Technical Specification", title_style))
    story.append(Paragraph(f"<b>Project Name:</b> {project_name} | <b>Compiled:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}", body_style))
    story.append(Spacer(1, 10))
    story.append(Table([[ "" ]], colWidths=[540], rowHeights=[2], style=TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), secondary_color),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ])))
    story.append(Spacer(1, 12))

    # 1. Requirements Summary
    story.append(Paragraph("1. System Requirements & Goals", h1_style))
    story.append(Paragraph(requirement_summary or "No summary compiled yet.", body_style))
    
    # Goals bullet list
    if goals:
        story.append(Paragraph("<b>System Goals:</b>", body_style))
        for goal in goals:
            story.append(Paragraph(f"• {goal}", body_style))
    
    # Constraints list
    if constraints:
        story.append(Paragraph("<b>Design Constraints:</b>", body_style))
        for constraint in constraints:
            story.append(Paragraph(f"• {constraint}", body_style))
            
    story.append(Spacer(1, 10))

    # 2. Hardware Architecture Choice
    story.append(Paragraph("2. Selected Hardware & BOM", h1_style))
    mcu = hardware_design.get("mcu") if hardware_design else ""
    if not mcu and req_doc:
        summary_text = req_doc.get("summary", "")
        if "Arduino" in summary_text:
            mcu = "Arduino Uno (ATmega328P)"
        elif "ESP32" in summary_text:
            mcu = "ESP32-WROOM-32E"
        elif "STM32" in summary_text:
            mcu = "STM32F407VGT6"

    if mcu or (hardware_design and (hardware_design.get("bom") or hardware_design.get("components"))):
        story.append(Paragraph(f"<b>Target Microcontroller:</b> {mcu or 'Embedded System Core'}", body_style))
        story.append(Spacer(1, 4))
        
        # BOM Table
        bom_list = hardware_design.get("bom", []) if hardware_design else []
        if not bom_list and hardware_design and hardware_design.get("components"):
            # Construct BOM from components list if bom is empty
            for idx, c in enumerate(hardware_design.get("components", [])):
                name = c.get("name") if isinstance(c, dict) else getattr(c, "name", "Component")
                bom_list.append({
                    "item": name,
                    "qty": 1,
                    "cost": 1.50 if "MCU" in name or "Arduino" in name else 0.25
                })

        if bom_list:
            bom_data = [["Component Item", "Qty Required", "Est. Unit Cost (USD)"]]
            for item in bom_list:
                item_name = item.get("item", "Part")
                qty = item.get("qty", 1)
                cost = item.get("cost", 0.0)
                bom_data.append([item_name, str(qty), f"${cost:.2f}"])
                
            t = Table(bom_data, colWidths=[260, 90, 90])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
                ('TEXTCOLOR', (0,0), (-1,0), primary_color),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0,0), (-1,0), 5),
                ('TOPPADDING', (0,0), (-1,0), 5),
                ('ALIGN', (1,0), (-1,-1), 'CENTER'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
                ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("<i>Bill of Materials details pending compilation.</i>", body_style))
    else:
        story.append(Paragraph("No hardware design compiled yet.", body_style))
        
    story.append(Spacer(1, 10))

    # 3. Pin Map Connection Table
    story.append(Paragraph("3. GPIO Connection Pinout Map", h1_style))
    pin_data = [["Component / Device Pin", "Target Function", "MCU Port / Pin"]]
    has_pins = False

    if hardware_design and hardware_design.get("pin_map"):
        pm = hardware_design.get("pin_map")
        if isinstance(pm, dict) and pm:
            for comp, mappings in pm.items():
                if isinstance(mappings, dict):
                    for p_pin, m_pin in mappings.items():
                        pin_data.append([f"{comp} ({p_pin})", "Digital GPIO / Periph", str(m_pin)])
                        has_pins = True
        elif isinstance(pm, list) and pm:
            for item in pm:
                if isinstance(item, dict):
                    dev_pin = item.get("device_pin") or item.get("component_name", "Device")
                    mcu_pin = item.get("mcu_pin") or item.get("pin_name", "Pin")
                    desc = item.get("description", "GPIO Link")
                    pin_data.append([dev_pin, desc, mcu_pin])
                    has_pins = True

    if has_pins:
        pt = Table(pin_data, colWidths=[180, 150, 110])
        pt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0,0), (-1,0), primary_color),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 5),
            ('TOPPADDING', (0,0), (-1,0), 5),
            ('ALIGN', (2,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ]))
        story.append(pt)
    else:
        story.append(Paragraph("<i>No GPIO pin connections mapped yet.</i>", body_style))

    story.append(Spacer(1, 10))

    # 4. Source Code Files
    story.append(Paragraph("4. Synthesized Firmware Files Outline", h1_style))
    if firmware_files:
        for f in firmware_files:
            filename = f.filename if hasattr(f, 'filename') else f.get('filename', 'Unknown')
            content = f.content if hasattr(f, 'content') else f.get('content', '')
            
            story.append(Paragraph(f"<b>File: {filename}</b>", body_style))
            if content:
                # Sanitize HTML tags for ReportLab Paragraph formatting
                code_text = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>').replace(' ', '&nbsp;')
                story.append(Paragraph(code_text, code_style))
            else:
                story.append(Paragraph("<i>Code buffer empty.</i>", body_style))
            story.append(Spacer(1, 6))
    else:
        story.append(Paragraph("No driver code files synthesized yet.", body_style))

    # Build the document flow
    doc.build(story)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

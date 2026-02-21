# D:\My_Work\smartShieldAI\backend\app\scanner\routes.py

import os
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from app.auth.dependencies import get_current_user
from app.database.models import User
from app.scanner.analyzer import analyze_smart_contract
from typing import Optional
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing, Line
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.widgets.markers import makeMarker
import io
import textwrap

router = APIRouter(prefix="/scan", tags=["Smart Contract Scanner"])

# Get the absolute path to the backend directory
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
REPORTS_DIR = os.path.join(BACKEND_DIR, "reports")

# Print paths for debugging (remove in production)
print(f"BACKEND_DIR: {BACKEND_DIR}")
print(f"UPLOAD_DIR: {UPLOAD_DIR}")
print(f"REPORTS_DIR: {REPORTS_DIR}")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.post("/upload")
async def upload_contract(
    file: UploadFile = File(...),
    detailed: Optional[bool] = True,
    current_user: User = Depends(get_current_user)
):
    """
    Upload and analyze a Solidity smart contract
    - Returns detailed vulnerability report
    - Includes deployment readiness assessment
    - Color-coded risk levels (🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🔵 LOW, 🟢 SAFE)
    """
    
    # =============================
    # Validate file type
    # =============================
    if not file.filename.endswith(".sol"):
        raise HTTPException(status_code=400, detail="Only .sol files allowed")
    
    # Create unique filename to avoid conflicts
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    print(f"Saving file to: {file_path}")  # Debug print
    
    try:
        # =============================
        # Save file
        # =============================
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        print(f"File saved successfully at: {file_path}")  # Debug print
        
        # =============================
        # Read file content
        # =============================
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
        
        # =============================
        # Analyze contract deeply
        # =============================
        report = analyze_smart_contract(code)
        
        # =============================
        # Save report for history
        # =============================
        report_filename = f"{timestamp}_{file.filename.replace('.sol', '_report.json')}"
        report_path = os.path.join(REPORTS_DIR, report_filename)
        
        print(f"Saving report to: {report_path}")  # Debug print
        
        # Add metadata to report
        full_report = {
            "filename": file.filename,
            "uploaded_by": current_user.email,
            "uploaded_at": timestamp,
            "contract_name": file.filename.replace('.sol', ''),
            "analysis_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "report": report
        }
        
        with open(report_path, "w") as f:
            json.dump(full_report, f, indent=2)
        
        print(f"Report saved successfully at: {report_path}")  # Debug print
        
        # =============================
        # Return formatted response
        # =============================
        return JSONResponse(content={
            "status": "success",
            "filename": file.filename,
            "uploaded_by": current_user.email,
            "uploaded_at": timestamp,
            "security_score": report["security_score"],
            "deployment_readiness": report["deployment_readiness"],
            "summary": report["summary"],
            "vulnerabilities": report["vulnerabilities"],
            "report_id": report_filename,
            "message": _get_deployment_message(report)
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")  # Debug print
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def _get_deployment_message(report: dict) -> str:
    """Generate user-friendly deployment message"""
    if report["deployment_readiness"]["can_deploy"]:
        if report["summary"]["critical"] == 0 and report["summary"]["high"] == 0:
            return "CONTRACT IS SAFE TO DEPLOY! No critical or high vulnerabilities found."
        else:
            return "Proceed with caution: Fix all HIGH issues before mainnet deployment."
    else:
        if report["summary"]["critical"] > 0:
            return "DO NOT DEPLOY! Critical vulnerabilities detected. Fix all HIGH issues first."
        else:
            return "DO NOT DEPLOY! High vulnerabilities detected. Fix all LOW issues first."

@router.get("/report/{report_id}")
def get_report(report_id: str, current_user: User = Depends(get_current_user)):
    report_path = os.path.join(REPORTS_DIR, report_id)

    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report not found")

    with open(report_path, "r") as f:
        report_data = json.load(f)

    # user access check
    if report_data["uploaded_by"] != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied")

    return JSONResponse(content=report_data)

def generate_professional_pdf_report(report_data: dict, pdf_path: str):
    """Generate a super professional and developer-friendly PDF report"""
    
    # Create the PDF document with better formatting
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#34495E'),
        spaceAfter=12,
        spaceBefore=20,
        fontName='Helvetica-Bold',
        borderWidth=1,
        borderColor=colors.HexColor('#BDC3C7'),
        borderPadding=(5, 5, 5, 5),
        borderRadius=5
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#7F8C8D'),
        spaceAfter=10,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=8,
        fontName='Helvetica',
        alignment=TA_LEFT
    )
    
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#27AE60'),
        spaceAfter=6,
        fontName='Courier',
        backColor=colors.HexColor('#ECF0F1'),
        borderPadding=(5, 5, 5, 5),
        borderWidth=1,
        borderColor=colors.HexColor('#BDC3C7'),
        borderRadius=3
    )
    
    # Add header with logo and title
    header_text = f"""
    <para alignment="center">
    <font name="Helvetica-Bold" size="24" color="#2C3E50">🔐 SmartShield AI</font><br/>
    <font name="Helvetica" size="14" color="#7F8C8D">Smart Contract Security Audit Report</font>
    </para>
    """
    elements.append(Paragraph(header_text, title_style))
    elements.append(Spacer(1, 20))
    
    # Add a line separator
    line = Drawing(450, 1)
    line.add(Line(0, 0, 450, 0, strokeColor=colors.HexColor('#BDC3C7'), strokeWidth=1))
    elements.append(line)
    elements.append(Spacer(1, 20))
    
    # Report Metadata Section
    elements.append(Paragraph("📋 Report Information", heading_style))
    
    metadata_data = [
        ["Contract Name:", report_data.get('contract_name', 'N/A')],
        ["File Name:", report_data.get('filename', 'N/A')],
        ["Analysis Date:", report_data.get('analysis_date', 'N/A')],
        ["Uploaded By:", report_data.get('uploaded_by', 'N/A')]
    ]
    
    metadata_table = Table(metadata_data, colWidths=[120, 300])
    metadata_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#7F8C8D')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#2C3E50')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(metadata_table)
    elements.append(Spacer(1, 20))
    
    # Security Score Section with visual indicator
    elements.append(Paragraph("Security Score & Assessment", heading_style))
    
    security_score = report_data['report']['security_score']
    score_color = colors.HexColor('#27AE60') if security_score >= 80 else colors.HexColor('#F39C12') if security_score >= 60 else colors.HexColor('#E74C3C')
    
    score_text = f"""
    <para alignment="center">
    <font name="Helvetica-Bold" size="48" color="{score_color.hexval()}">{security_score}</font><br/>
    <font name="Helvetica" size="14" color="#7F8C8D">out of 100</font>
    </para>
    """
    elements.append(Paragraph(score_text, normal_style))
    elements.append(Spacer(1, 10))
    
    # Deployment Readiness
    deployment = report_data['report']['deployment_readiness']
    readiness_color = colors.HexColor('#27AE60') if deployment['can_deploy'] else colors.HexColor('#E74C3C')
    readiness_text = f"""
    <para alignment="center">
    <font name="Helvetica-Bold" size="16" color="{readiness_color.hexval()}">
    {'SAFE TO DEPLOY' if deployment['can_deploy'] else 'DO NOT DEPLOY'}
    </font><br/>
    <font name="Helvetica" size="11" color="#7F8C8D">{deployment.get('reason') or deployment.get('message')}</font>
    </para>
    """
    elements.append(Paragraph(readiness_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # Vulnerability Summary with visual bars
    elements.append(Paragraph("Vulnerability Summary", heading_style))
    
    summary = report_data['report']['summary']
    
    # Create summary table with color coding
    summary_data = [
    ["Critical", str(summary.get('critical', 0)), "🔴"],
    ["High", str(summary.get('high', 0)), "🟠"],
    ["Medium", str(summary.get('medium', 0)), "🟡"],
    ["Low", str(summary.get('low', 0)), "🔵"],
    ["Gas", str(summary.get('gas', 0)), "⚡"]
    ]
    
    summary_table = Table(summary_data, colWidths=[100, 50, 30])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2C3E50')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#7F8C8D')),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#FFE5E5')),
        ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#FFE5CC')),
        ('BACKGROUND', (0, 2), (0, 2), colors.HexColor('#FFF4CC')),
        ('BACKGROUND', (0, 3), (0, 3), colors.HexColor('#E5F2FF')),
        ('BACKGROUND', (0, 4), (0, 4), colors.HexColor('#E5FFE5')),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#BDC3C7')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Detailed Vulnerabilities Section
    if report_data['report']['vulnerabilities']:
        elements.append(Paragraph("🔍 Detailed Vulnerability Analysis", heading_style))
        
        for i, vuln in enumerate(report_data['report']['vulnerabilities'], 1):
            # Determine color based on severity
            severity = vuln.get('severity', '').upper()
            if severity == 'CRITICAL':
                severity_color = colors.HexColor('#E74C3C')
                bg_color = colors.HexColor('#FFE5E5')
                icon = "🔴"
            elif severity == 'HIGH':
                severity_color = colors.HexColor('#E67E22')
                bg_color = colors.HexColor('#FFE5CC')
                icon = "🟠"
            elif severity == 'MEDIUM':
                severity_color = colors.HexColor('#F1C40F')
                bg_color = colors.HexColor('#FFF4CC')
                icon = "🟡"
            elif severity == 'LOW':
                severity_color = colors.HexColor('#3498DB')
                bg_color = colors.HexColor('#E5F2FF')
                icon = "🔵"
            else:
                severity_color = colors.HexColor('#7F8C8D')
                bg_color = colors.HexColor('#F5F5F5')
                icon = "⚪"
            
            # Vulnerability header
            vuln_header = f"""
            <para>
            <font name="Helvetica-Bold" size="13" color="{severity_color.hexval()}">
            {icon} {i}. {vuln.get('title', 'Unknown Vulnerability')}
            </font>
            </para>
            """
            elements.append(Paragraph(vuln_header, normal_style))
            
            # Severity badge
            severity_badge = f"""
            <para>
            <font name="Helvetica-Bold" size="10" color="white">
            <b>Severity: {severity}</b>
            </font>
            </para>
            """
            elements.append(Paragraph(severity_badge, ParagraphStyle(
                'SeverityBadge',
                parent=normal_style,
                backColor=severity_color,
                textColor=colors.white,
                alignment=TA_LEFT,
                borderPadding=(3, 6, 3, 6),
                borderRadius=3
            )))
            
            # Description
            desc_text = f"""
            <para>
            <font name="Helvetica" size="11" color="#2C3E50">
            <b>📝 Description:</b> {vuln.get('description', 'N/A')}
            </font>
            </para>
            """
            elements.append(Paragraph(desc_text, normal_style))
            
            # Location
            if 'line' in vuln:
                loc_text = f"""
                <para>
                <font name="Helvetica" size="11" color="#7F8C8D">
                <b>📍 Location:</b> Line {vuln['line']}
                </font>
                </para>
                """
                elements.append(Paragraph(loc_text, normal_style))
            
            # Recommendation
            if 'recommendation' in vuln:
                rec_text = f"""
                <para>
                <font name="Helvetica" size="11" color="#27AE60">
                <b>💡 Recommendation:</b> {vuln['recommendation']}
                </font>
                </para>
                """
                elements.append(Paragraph(rec_text, normal_style))
            
            # Code snippet if available
            if 'code' in vuln:
                code_lines = textwrap.wrap(vuln['code'], width=60)
                for line in code_lines:
                    code_text = f"""
                    <para>
                    <font name="Courier" size="9" color="#27AE60">
                    {line}
                    </font>
                    </para>
                    """
                    elements.append(Paragraph(code_text, code_style))
            
            elements.append(Spacer(1, 15))
    
    # Add footer with timestamp
    elements.append(Spacer(1, 30))
    footer_text = f"""
    <para alignment="center">
    <font name="Helvetica" size="8" color="#95A5A6">
    Report generated by SmartShield AI on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>
    This is an automated security analysis. Always perform additional manual review before deployment.
    </font>
    </para>
    """
    elements.append(Paragraph(footer_text, normal_style))
    
    # Build PDF
    doc.build(elements)

@router.get("/report/{report_id}/download")
async def download_report_pdf(report_id: str, current_user: User = Depends(get_current_user)):
    report_path = os.path.join(REPORTS_DIR, report_id)

    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="Report not found")

    # Load JSON report
    with open(report_path, "r") as f:
        report_data = json.load(f)

    # User access check
    if report_data.get("uploaded_by") != current_user.email:
        raise HTTPException(status_code=403, detail="Access denied")

    # Create PDF file path
    pdf_filename = report_id.replace(".json", ".pdf")
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)

    try:
        # Generate professional PDF
        generate_professional_pdf_report(report_data, pdf_path)
        
        # Return the PDF file
        return FileResponse(
            path=pdf_path,
            filename=f"SmartShield_Report_{report_data.get('contract_name', 'contract')}.pdf",
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=SmartShield_Report_{report_data.get('contract_name', 'contract')}.pdf"
            }
        )
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
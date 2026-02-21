import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUploadContractMutation, useGetReportQuery } from '../auth/authApiSlice';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('upload');
    const [uploadContract, { isLoading }] = useUploadContractMutation();
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [reportId, setReportId] = useState(null);
    const { data: reportData, isFetching } = useGetReportQuery(reportId, {
        skip: !reportId
    });
    const reports = reportData ? [reportData] : [];
    console.log("REPORT DATA:", reportData);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setUploadError('');
        setUploadSuccess('');

        if (file) {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (fileExtension !== 'sol') {
                setUploadError('Only .sol files are allowed');
                setSelectedFile(null);
                e.target.value = null;
            } else {
                setSelectedFile(file);
            }
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            setUploadError('Please select a file first');
            return;
        }
        try {
            setUploadError('');
            setUploadSuccess('');
            const response = await uploadContract(selectedFile).unwrap();
            console.log("UPLOAD RESPONSE:", response);
            setUploadSuccess("Upload successful!");
            setReportId(response.report_id);
            setActiveTab('reports');
        } catch (error) {
            console.error(error);
            setUploadError(error?.data?.detail || "Upload failed");
        }
    };

    const handleDownloadPDF = (report) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Company Header
        doc.setFillColor(33, 33, 33);
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('SMARTSHIELDAI', 20, 25);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Security Audit Report', 20, 35);

        // Title
        doc.setTextColor(33, 33, 33);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Smart Contract Security Analysis', 20, 55);

        // Report Metadata Card
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(20, 65, pageWidth - 40, 35, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Filename:', 25, 75);
        doc.text('Uploaded by:', 25, 82);
        doc.text('Uploaded at:', 25, 89);

        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text(String(report.filename || "N/A"), 70, 75);
        doc.text(String(report.uploaded_by || "N/A"), 70, 82);
        doc.text(String(report.uploaded_at ? new Date(report.uploaded_at).toLocaleString() : "N/A"), 70, 89);

        // Security Score Card
        const scoreX = pageWidth - 60;
        const scoreY = 65;

        doc.setFillColor(135, 206, 235);
        doc.circle(scoreX, scoreY + 10, 12, 'F');

        doc.setFontSize(16);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text(String(report.report?.security_score ?? "0"), scoreX - 6, scoreY + 13);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Security Score', scoreX - 18, scoreY + 25);

        // Contract Information
        let yPos = 115;

        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('Contract Information', 20, yPos);

        yPos += 10;
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(20, yPos, pageWidth - 40, 30, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Contract Name:', 25, yPos + 7);
        doc.text('Pragma Version:', 25, yPos + 17);

        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text(String(report.report?.contract_name || "N/A"), 70, yPos + 7);
        doc.text(String(report.report?.pragma_version || "N/A"), 70, yPos + 17);

        // Deployment Readiness
        yPos += 45;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Deployment Readiness', 20, yPos);

        yPos += 10;
        const riskLevel = report.report.deployment_readiness.risk_level;
        const riskColor = riskLevel === 'HIGH' ? [220, 53, 69] :
            riskLevel === 'MEDIUM' ? [255, 193, 7] : [40, 167, 69];

        doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${riskLevel} RISK`, 25, yPos + 10);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
            String(report.report?.deployment_readiness?.message || "No message"),
            25,
            yPos + 18
        );

        // Vulnerabilities Summary
        yPos += 40;
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('Vulnerability Summary', 20, yPos);

        yPos += 10;
        const summary = report.report.summary;
        const summaryItems = [
            { label: 'CRITICAL', value: summary.critical, color: [220, 53, 69] },
            { label: 'HIGH', value: summary.high, color: [253, 126, 20] },
            { label: 'MEDIUM', value: summary.medium, color: [255, 193, 7] },
            { label: 'LOW', value: summary.low, color: [23, 162, 184] },
            { label: 'INFO', value: summary.info, color: [108, 117, 125] }
        ];

        const itemWidth = (pageWidth - 60) / 5;
        summaryItems.forEach((item, index) => {
            const x = 20 + (index * itemWidth);

            // Background
            doc.setFillColor(248, 249, 250);
            doc.rect(x, yPos, itemWidth - 5, 35, 'F');

            // Value
            doc.setFontSize(20);
            doc.setTextColor(item.color[0], item.color[1], item.color[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(item.value.toString(), x + 10, yPos + 20);

            // Label
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text(item.label, x + 10, yPos + 30);
        });

        // Vulnerabilities Table
        yPos += 55;
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.setFont('helvetica', 'bold');
        doc.text('Detailed Vulnerabilities', 20, yPos);

        const tableData = (report.report?.vulnerabilities || []).map(vuln => [
            String(vuln.issue || ""),
            String(vuln.severity || ""),
            String(vuln.likelihood || ""),
            String(vuln.impact || "")
        ]);

        autoTable(doc, {
            startY: yPos + 5,
            head: [['Issue', 'Severity', 'Likelihood', 'Impact']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [33, 33, 33],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10
            },
            bodyStyles: {
                fontSize: 9
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 40 },
                2: { cellWidth: 40 },
                3: { cellWidth: 40 }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `SmartShieldAI - Confidential Security Report - Page ${i} of ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        // Save the PDF
        doc.save(`${report.filename.replace('.sol', '')}_security_audit.pdf`);
    };

    const handleLogout = () => {
        window.location.href = '/';
    };

    const getSeverityColor = (severity) => {
        if (severity.includes('CRITICAL')) return '#dc3545';
        if (severity.includes('HIGH')) return '#fd7e14';
        if (severity.includes('MEDIUM')) return '#ffc107';
        if (severity.includes('LOW')) return '#17a2b8';
        return '#6c757d';
    };

    // Icons as SVG strings
    const Icons = {
        upload: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
        reports: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
        logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
        file: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
        download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        shield: `<svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    };

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.logo}>
                    <h2 style={styles.logoText}>SMARTSHIELDAI</h2>
                    <p style={styles.logoSubtext}>Security Audit Platform</p>
                </div>

                <nav style={styles.nav}>
                    <button
                        className="nav-item"
                        style={{
                            ...styles.navItem,
                            ...(activeTab === 'upload' ? styles.navItemActive : {})
                        }}
                        onClick={() => setActiveTab('upload')}
                    >
                        <span style={styles.navIcon} dangerouslySetInnerHTML={{ __html: Icons.upload }} />
                        Upload Solidity File
                    </button>

                    <button
                        className="nav-item"
                        style={{
                            ...styles.navItem,
                            ...(activeTab === 'reports' ? styles.navItemActive : {})
                        }}
                        onClick={() => setActiveTab('reports')}
                    >
                        <span style={styles.navIcon} dangerouslySetInnerHTML={{ __html: Icons.reports }} />
                        Reports
                    </button>

                    <button
                        className="nav-item"
                        style={styles.navItem}
                        onClick={handleLogout}
                    >
                        <span style={styles.navIcon} dangerouslySetInnerHTML={{ __html: Icons.logout }} />
                        Logout
                    </button>
                </nav>

                <div style={styles.userInfo}>
                    <div style={styles.userAvatar}>P</div>
                    <div>
                        <p style={styles.userName}>Prabha</p>
                        <p style={styles.userEmail}>prabha@gmail.com</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>
                {activeTab === 'upload' && (
                    <div style={styles.contentCard}>
                        <h2 style={styles.contentTitle}>Upload Solidity File</h2>
                        <p style={styles.contentSubtitle}>Upload your .sol file for comprehensive security analysis</p>

                        <div style={styles.uploadArea}>
                            <input
                                type="file"
                                id="file-upload"
                                accept=".sol"
                                onChange={handleFileChange}
                                style={styles.fileInput}
                            />
                            <label htmlFor="file-upload" style={styles.fileLabel}>
                                <span dangerouslySetInnerHTML={{ __html: Icons.file }} />
                                <span>Choose File</span>
                            </label>

                            {selectedFile && (
                                <div style={styles.fileInfo}>
                                    <div style={styles.fileDetails}>
                                        <span dangerouslySetInnerHTML={{ __html: Icons.file }} />
                                        <div>
                                            <p style={styles.fileName}>{selectedFile.name}</p>
                                            <p style={styles.fileSize}>
                                                {(selectedFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {uploadError && (
                                <div style={styles.errorMessage}>
                                    {uploadError}
                                </div>
                            )}

                            {uploadSuccess && (
                                <div style={styles.successMessage}>
                                    {uploadSuccess}
                                </div>
                            )}

                            <button
                                style={{
                                    ...styles.uploadButton,
                                    ...(!selectedFile && styles.uploadButtonDisabled)
                                }}
                                onClick={handleFileUpload}
                                disabled={!selectedFile}
                            >
                                {isLoading ? 'Analyzing...' : 'Upload & Analyze'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div style={styles.reportsContainer}>
                        <h2 style={styles.contentTitle}>Security Reports</h2>

                        {reports.map((report, index) => (
                            <div key={index} style={styles.reportCard}>
                                <div style={styles.reportHeader}>
                                    <div>
                                        <h3 style={styles.reportFilename}>{report.filename}</h3>
                                        <p style={styles.reportMeta}>
                                            Uploaded by {report.uploaded_by} • {new Date(report.uploaded_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div style={styles.reportActions}>
                                        <button
                                            style={styles.downloadButton}
                                            onClick={() => handleDownloadPDF(report)}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: Icons.download }} />
                                            Download PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Security Score */}
                                <div style={styles.scoreSection}>
                                    <div style={styles.scoreCircle}>
                                        <span style={styles.scoreNumber}>{report.report.security_score}</span>
                                        <span style={styles.scoreLabel}>Security Score</span>
                                    </div>
                                    <div style={styles.deploymentInfo}>
                                        <span style={{
                                            ...styles.deploymentBadge,
                                            backgroundColor: report.report.deployment_readiness.risk_level === 'HIGH' ? '#dc3545' :
                                                report.report.deployment_readiness.risk_level === 'MEDIUM' ? '#ffc107' : '#28a745',
                                            color: report.report.deployment_readiness.risk_level === 'MEDIUM' ? '#000' : '#fff'
                                        }}>
                                            {report.report.deployment_readiness.risk_level} RISK
                                        </span>
                                        <p style={styles.deploymentMessage}>
                                            {report.report.deployment_readiness.message}
                                        </p>
                                    </div>
                                </div>

                                {/* Summary Stats */}
                                <div style={styles.summaryStats}>
                                    <div style={styles.statItem}>
                                        <span style={{ ...styles.statValue, color: '#dc3545' }}>{report.report.summary.critical}</span>
                                        <span style={styles.statLabel}>Critical</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={{ ...styles.statValue, color: '#fd7e14' }}>{report.report.summary.high}</span>
                                        <span style={styles.statLabel}>High</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={{ ...styles.statValue, color: '#ffc107' }}>{report.report.summary.medium}</span>
                                        <span style={styles.statLabel}>Medium</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={{ ...styles.statValue, color: '#17a2b8' }}>{report.report.summary.low}</span>
                                        <span style={styles.statLabel}>Low</span>
                                    </div>
                                    <div style={styles.statItem}>
                                        <span style={{ ...styles.statValue, color: '#6c757d' }}>{report.report.summary.info}</span>
                                        <span style={styles.statLabel}>Info</span>
                                    </div>
                                </div>

                                {/* Vulnerabilities */}
                                <div style={styles.vulnerabilitiesSection}>
                                    <h4 style={styles.sectionTitle}>Vulnerabilities Found</h4>
                                    {report.report.vulnerabilities.map((vuln, idx) => (
                                        <div key={idx} style={styles.vulnerabilityItem}>
                                            <div style={styles.vulnerabilityHeader}>
                                                <span style={styles.vulnerabilityTitle}>{vuln.issue}</span>
                                                <span style={{
                                                    ...styles.severityBadge,
                                                    backgroundColor: getSeverityColor(vuln.severity),
                                                    color: vuln.severity.includes('INFO') || vuln.severity.includes('MEDIUM') ? '#000000' : '#FFFFFF'
                                                }}>
                                                    {vuln.severity}
                                                </span>
                                            </div>
                                            <p style={styles.vulnerabilityDescription}>{vuln.description}</p>
                                            <div style={styles.vulnerabilityDetails}>
                                                <div style={styles.detailRow}>
                                                    <span style={styles.detailLabel}>Impact</span>
                                                    <span style={styles.detailValue}>{vuln.impact}</span>
                                                </div>
                                                <div style={styles.detailRow}>
                                                    <span style={styles.detailLabel}>Likelihood</span>
                                                    <span style={styles.detailValue}>{vuln.likelihood}</span>
                                                </div>
                                                {vuln.cwe_reference && (
                                                    <div style={styles.detailRow}>
                                                        <span style={styles.detailLabel}>CWE</span>
                                                        <span style={styles.detailValue}>{vuln.cwe_reference}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={styles.fixSection}>
                                                <strong style={styles.fixTitle}>Recommendation</strong>
                                                <p style={styles.fixText}>{vuln.fix}</p>
                                            </div>
                                            {vuln.line_numbers.length > 0 && (
                                                <div style={styles.lineNumbers}>
                                                    <strong>Affected lines: </strong>
                                                    {vuln.line_numbers.join(', ')}
                                                </div>
                                            )}
                                            {vuln.code_snippet && (
                                                <pre style={styles.codeSnippet}>
                                                    {vuln.code_snippet}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    sidebar: {
        width: '280px',
        backgroundColor: '#ffffff',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
    },
    logo: {
        padding: '32px 24px',
        borderBottom: '1px solid #e9ecef',
    },
    logoText: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#212529',
        margin: 0,
        letterSpacing: '-0.5px',
    },
    logoSubtext: {
        fontSize: '12px',
        color: '#6c757d',
        margin: '4px 0 0',
    },
    nav: {
        flex: 1,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    navItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        color: '#6c757d',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
        textAlign: 'left',
    },
    navItemActive: {
        backgroundColor: '#e7f5ff',
        color: '#228be6',
    },
    navIcon: {
        display: 'flex',
        alignItems: 'center',
        width: '20px',
        height: '20px',
    },
    userInfo: {
        padding: '24px',
        borderTop: '1px solid #e9ecef',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    userAvatar: {
        width: '40px',
        height: '40px',
        borderRadius: '40px',
        backgroundColor: '#228be6',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: '600',
    },
    userName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#212529',
        margin: 0,
    },
    userEmail: {
        fontSize: '12px',
        color: '#6c757d',
        margin: '4px 0 0',
    },
    mainContent: {
        flex: 1,
        marginLeft: '280px',
        padding: '32px',
    },
    contentCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
    },
    contentTitle: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#212529',
        marginBottom: '8px',
    },
    contentSubtitle: {
        fontSize: '14px',
        color: '#6c757d',
        marginBottom: '32px',
    },
    uploadArea: {
        border: '2px dashed #dee2e6',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        transition: 'border-color 0.2s ease',
    },
    fileInput: {
        display: 'none',
    },
    fileLabel: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        backgroundColor: '#ffffff',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#495057',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    fileInfo: {
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
    },
    fileDetails: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    fileName: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#212529',
        margin: 0,
    },
    fileSize: {
        fontSize: '12px',
        color: '#6c757d',
        margin: '4px 0 0',
    },
    uploadButton: {
        backgroundColor: '#228be6',
        color: '#ffffff',
        padding: '12px 32px',
        fontSize: '14px',
        fontWeight: '600',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        marginTop: '24px',
    },
    uploadButtonDisabled: {
        backgroundColor: '#e9ecef',
        color: '#adb5bd',
        cursor: 'not-allowed',
    },
    errorMessage: {
        backgroundColor: '#fff5f5',
        color: '#e03131',
        padding: '12px',
        borderRadius: '6px',
        marginTop: '16px',
        fontSize: '14px',
    },
    successMessage: {
        backgroundColor: '#f1f8e9',
        color: '#2e7d32',
        padding: '12px',
        borderRadius: '6px',
        marginTop: '16px',
        fontSize: '14px',
    },
    reportsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    reportCard: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
    },
    reportHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e9ecef',
    },
    reportFilename: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#212529',
        marginBottom: '4px',
    },
    reportMeta: {
        fontSize: '13px',
        color: '#6c757d',
    },
    reportActions: {
        display: 'flex',
        gap: '12px',
    },
    downloadButton: {
        backgroundColor: '#ffffff',
        color: '#228be6',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '500',
        border: '1px solid #228be6',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    scoreSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        marginBottom: '32px',
    },
    scoreCircle: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
    },
    scoreNumber: {
        fontSize: '32px',
        fontWeight: '700',
        lineHeight: 1,
    },
    scoreLabel: {
        fontSize: '11px',
        opacity: 0.9,
        marginTop: '4px',
    },
    deploymentInfo: {
        flex: 1,
    },
    deploymentBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        marginBottom: '8px',
    },
    deploymentMessage: {
        fontSize: '14px',
        color: '#495057',
        margin: 0,
        lineHeight: 1.6,
    },
    summaryStats: {
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
    },
    statItem: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '8px',
        textAlign: 'center',
    },
    statValue: {
        display: 'block',
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '12px',
        color: '#6c757d',
    },
    vulnerabilitiesSection: {
        marginTop: '24px',
    },
    sectionTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#212529',
        marginBottom: '16px',
    },
    vulnerabilityItem: {
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '16px',
    },
    vulnerabilityHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    vulnerabilityTitle: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#212529',
    },
    severityBadge: {
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '600',
    },
    vulnerabilityDescription: {
        fontSize: '14px',
        color: '#495057',
        marginBottom: '16px',
        lineHeight: 1.6,
    },
    vulnerabilityDetails: {
        backgroundColor: '#ffffff',
        padding: '12px',
        borderRadius: '6px',
        marginBottom: '12px',
    },
    detailRow: {
        display: 'flex',
        marginBottom: '4px',
    },
    detailLabel: {
        width: '80px',
        fontSize: '13px',
        fontWeight: '500',
        color: '#6c757d',
    },
    detailValue: {
        fontSize: '13px',
        color: '#212529',
    },
    fixSection: {
        backgroundColor: '#e7f5ff',
        padding: '16px',
        borderRadius: '6px',
        marginBottom: '12px',
    },
    fixTitle: {
        fontSize: '13px',
        color: '#1864ab',
        display: 'block',
        marginBottom: '8px',
    },
    fixText: {
        fontSize: '13px',
        color: '#212529',
        margin: 0,
        lineHeight: 1.6,
    },
    lineNumbers: {
        fontSize: '13px',
        color: '#495057',
        marginBottom: '8px',
    },
    codeSnippet: {
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '16px',
        borderRadius: '6px',
        fontSize: '12px',
        overflowX: 'auto',
        fontFamily: '"Fira Code", "Courier New", monospace',
        lineHeight: 1.5,
    },
};

// Add global styles
const addGlobalStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        .nav-item:hover {
            background-color: #f1f3f5;
            color: #228be6;
        }
        button:hover:not(:disabled) {
            transform: translateY(-1px);
        }
        .download-button:hover {
            background-color: #228be6;
            color: #ffffff;
        }
        .file-label:hover {
            background-color: #f8f9fa;
            border-color: #228be6;
        }
        input[type="file"]:hover + label {
            border-color: #228be6;
        }
    `;
    document.head.appendChild(style);
};

if (typeof document !== 'undefined') {
    addGlobalStyles();
}

export default Dashboard;
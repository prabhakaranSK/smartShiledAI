import React, { useState } from 'react';
import { useSignupUserMutation } from "../auth/authApiSlice";
import { Link, useNavigate } from "react-router-dom";

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [signupUser, { isLoading }] = useSignupUserMutation();
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    // Icons as SVG strings
    const Icons = {
        user: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        email: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
        password: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        eye: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        eyeOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
        check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
        arrowRight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
        shield: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    };

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name) {
            newErrors.name = 'Name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain uppercase, lowercase and number';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        return newErrors;
    };

    const getPasswordStrength = (password) => {
        if (!password) return 0;
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/(?=.*[a-z])/.test(password)) strength++;
        if (/(?=.*[A-Z])/.test(password)) strength++;
        if (/(?=.*\d)/.test(password)) strength++;
        if (/(?=.*[!@#$%^&*])/.test(password)) strength++;
        return strength;
    };

    const getStrengthLabel = (strength) => {
        switch(strength) {
            case 0: return { label: 'Very Weak', color: '#e03131' };
            case 1: return { label: 'Weak', color: '#e03131' };
            case 2: return { label: 'Fair', color: '#fd7e14' };
            case 3: return { label: 'Good', color: '#fab005' };
            case 4: return { label: 'Strong', color: '#40c057' };
            case 5: return { label: 'Very Strong', color: '#2f9e44' };
            default: return { label: '', color: '#dee2e6' };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = validateForm();

        if (Object.keys(newErrors).length === 0) {
            try {
                const res = await signupUser(formData).unwrap();
                console.log("Signup success:", res);
                navigate('/');
            } catch (err) {
                setErrors({ general: err?.data?.detail || "Signup failed. Please try again." });
            }
        } else {
            setErrors(newErrors);
        }
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthInfo = getStrengthLabel(passwordStrength);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Brand Section */}
                <div style={styles.brandSection}>
                    <div dangerouslySetInnerHTML={{ __html: Icons.shield }} />
                    <h2 style={styles.brandName}>SMARTSHIELDAI</h2>
                    <p style={styles.brandTagline}>Start your security journey</p>
                    
                    <div style={styles.features}>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon} dangerouslySetInnerHTML={{ __html: Icons.check }} />
                            <span>Smart Contract Analysis</span>
                        </div>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon} dangerouslySetInnerHTML={{ __html: Icons.check }} />
                            <span>Comprehensive Reports</span>
                        </div>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon} dangerouslySetInnerHTML={{ __html: Icons.check }} />
                            <span>Real-time Vulnerability Detection</span>
                        </div>
                    </div>
                </div>

                <div style={styles.formContainer}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Create account</h1>
                        <p style={styles.subtitle}>Get started with SmartShieldAI</p>
                    </div>

                    {errors.general && (
                        <div style={styles.generalError}>
                            {errors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Full Name</label>
                            <div style={styles.inputWrapper}>
                                <span style={styles.inputIcon} dangerouslySetInnerHTML={{ __html: Icons.user }} />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                />
                            </div>
                            {errors.name && <span style={styles.error}>{errors.name}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email</label>
                            <div style={styles.inputWrapper}>
                                <span style={styles.inputIcon} dangerouslySetInnerHTML={{ __html: Icons.email }} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Enter your email"
                                />
                            </div>
                            {errors.email && <span style={styles.error}>{errors.email}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <div style={styles.inputWrapper}>
                                <span style={styles.inputIcon} dangerouslySetInnerHTML={{ __html: Icons.password }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Create a password"
                                />
                                <button 
                                    type="button"
                                    style={styles.eyeButton}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: showPassword ? Icons.eyeOff : Icons.eye }} />
                                </button>
                            </div>
                            
                            {formData.password && (
                                <div style={styles.strengthMeter}>
                                    <div style={styles.strengthBars}>
                                        {[1,2,3,4,5].map((level) => (
                                            <div
                                                key={level}
                                                style={{
                                                    ...styles.strengthBar,
                                                    backgroundColor: level <= passwordStrength ? strengthInfo.color : '#dee2e6',
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span style={{...styles.strengthLabel, color: strengthInfo.color}}>
                                        {strengthInfo.label}
                                    </span>
                                </div>
                            )}
                            
                            {errors.password && <span style={styles.error}>{errors.password}</span>}
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Confirm Password</label>
                            <div style={styles.inputWrapper}>
                                <span style={styles.inputIcon} dangerouslySetInnerHTML={{ __html: Icons.password }} />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Confirm your password"
                                />
                                <button 
                                    type="button"
                                    style={styles.eyeButton}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: showConfirmPassword ? Icons.eyeOff : Icons.eye }} />
                                </button>
                            </div>
                            {errors.confirmPassword && <span style={styles.error}>{errors.confirmPassword}</span>}
                        </div>

                        <button 
                            type="submit" 
                            style={styles.button}
                            disabled={isLoading}
                        >
                            <span>{isLoading ? 'Creating account...' : 'Create account'}</span>
                            {!isLoading && <span style={styles.buttonIcon} dangerouslySetInnerHTML={{ __html: Icons.arrowRight }} />}
                        </button>
                    </form>

                    <div style={styles.footer}>
                        <p style={styles.footerText}>
                            Already have an account?{' '}
                            <Link to="/" style={styles.link}>Sign in</Link>
                        </p>
                    </div>

                    <p style={styles.terms}>
                        By creating an account, you agree to our{' '}
                        <a href="/terms" style={styles.termsLink}>Terms of Service</a>{' '}
                        and{' '}
                        <a href="/privacy" style={styles.termsLink}>Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    card: {
        display: 'flex',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
        width: '100%',
        maxWidth: '1100px',
        minHeight: '700px',
        overflow: 'hidden',
    },
    brandSection: {
        flex: '1',
        background: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        color: '#ffffff',
    },
    brandName: {
        fontSize: '24px',
        fontWeight: '700',
        margin: '24px 0 8px',
        letterSpacing: '-0.5px',
    },
    brandTagline: {
        fontSize: '14px',
        opacity: '0.9',
        marginBottom: '48px',
    },
    features: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        marginTop: '32px',
    },
    feature: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '15px',
    },
    featureIcon: {
        display: 'flex',
        alignItems: 'center',
        color: '#ffffff',
    },
    formContainer: {
        flex: '1',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    header: {
        marginBottom: '32px',
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#212529',
        marginBottom: '8px',
        letterSpacing: '-0.5px',
    },
    subtitle: {
        fontSize: '16px',
        color: '#6c757d',
        margin: 0,
    },
    generalError: {
        backgroundColor: '#fff5f5',
        color: '#e03131',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '24px',
        border: '1px solid #ffc9c9',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#212529',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '12px',
        color: '#6c757d',
        display: 'flex',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        padding: '12px 12px 12px 40px',
        fontSize: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        outline: 'none',
        transition: 'all 0.2s ease',
        color: '#212529',
        backgroundColor: '#ffffff',
        fontFamily: 'inherit',
    },
    eyeButton: {
        position: 'absolute',
        right: '12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#6c757d',
        display: 'flex',
        alignItems: 'center',
        padding: 0,
    },
    strengthMeter: {
        marginTop: '8px',
    },
    strengthBars: {
        display: 'flex',
        gap: '4px',
        marginBottom: '4px',
    },
    strengthBar: {
        flex: 1,
        height: '4px',
        borderRadius: '2px',
        transition: 'background-color 0.2s ease',
    },
    strengthLabel: {
        fontSize: '12px',
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#228be6',
        color: '#ffffff',
        padding: '14px 24px',
        fontSize: '16px',
        fontWeight: '600',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginTop: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
    },
    buttonIcon: {
        display: 'flex',
        alignItems: 'center',
    },
    footer: {
        textAlign: 'center',
        marginTop: '24px',
    },
    footerText: {
        fontSize: '14px',
        color: '#6c757d',
    },
    link: {
        color: '#228be6',
        textDecoration: 'none',
        fontWeight: '600',
    },
    terms: {
        fontSize: '12px',
        color: '#868e96',
        textAlign: 'center',
        marginTop: '16px',
    },
    termsLink: {
        color: '#495057',
        textDecoration: 'none',
    },
    error: {
        color: '#e03131',
        fontSize: '12px',
        marginTop: '4px',
    },
};

// Add global styles
const addGlobalStyles = () => {
    const style = document.createElement('style');
    style.innerHTML = `
        input:hover, input:focus {
            border-color: #228be6 !important;
            box-shadow: 0 0 0 3px rgba(34, 139, 230, 0.1);
        }
        button:hover:not(:disabled) {
            background-color: #1c7ed6 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(34, 139, 230, 0.3);
        }
        a:hover {
            color: #1c7ed6 !important;
            text-decoration: underline !important;
        }
        .terms-link:hover {
            color: #228be6 !important;
        }
    `;
    document.head.appendChild(style);
};

if (typeof document !== 'undefined') {
    addGlobalStyles();
}

export default Signup;
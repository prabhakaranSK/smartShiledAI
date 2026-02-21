import React, { useState } from 'react';
import { useLoginUserMutation } from "../auth/authApiSlice";
import { useDispatch } from "react-redux";
import { setCredentials } from "../auth/authSlice";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loginUser, { isLoading }] = useLoginUserMutation();
    const dispatch = useDispatch();
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    // Icons as SVG strings
    const Icons = {
        email: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
        password: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        eye: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        eyeOff: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
        arrowRight: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
        shield: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    };

    const [showPassword, setShowPassword] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            const res = await loginUser(formData).unwrap();
            localStorage.setItem("token", res.access_token);
            dispatch(setCredentials(res));
            navigate("/dashboard");
        } catch (err) {
            setErrors({ general: "Invalid email or password. Please try again." });
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Brand Section */}
                <div style={styles.brandSection}>
                    <div dangerouslySetInnerHTML={{ __html: Icons.shield }} />
                    <h2 style={styles.brandName}>SMARTSHIELDAI</h2>
                    <p style={styles.brandTagline}>Secure Smart Contract Auditing</p>
                </div>

                <div style={styles.formContainer}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Welcome back</h1>
                        <p style={styles.subtitle}>Please enter your details to sign in</p>
                    </div>

                    {errors.general && (
                        <div style={styles.generalError}>
                            {errors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
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
                                    placeholder="Enter your password"
                                />
                                <button 
                                    type="button"
                                    style={styles.eyeButton}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: showPassword ? Icons.eyeOff : Icons.eye }} />
                                </button>
                            </div>
                            {errors.password && <span style={styles.error}>{errors.password}</span>}
                        </div>

                        <div style={styles.options}>
                            <label style={styles.checkbox}>
                                <input type="checkbox" style={styles.checkboxInput} />
                                <span style={styles.checkboxLabel}>Remember me</span>
                            </label>
                            <a href="/forgot-password" style={styles.forgotLink}>Forgot password?</a>
                        </div>

                        <button 
                            type="submit" 
                            style={styles.button}
                            disabled={isLoading}
                        >
                            <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
                            {!isLoading && <span style={styles.buttonIcon} dangerouslySetInnerHTML={{ __html: Icons.arrowRight }} />}
                        </button>
                    </form>

                    <div style={styles.footer}>
                        <p style={styles.footerText}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={styles.link}>Create an account</Link>
                        </p>
                    </div>
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
        maxWidth: '1000px',
        minHeight: '600px',
        overflow: 'hidden',
    },
    brandSection: {
        flex: '1',
        background: 'linear-gradient(135deg, #228be6 0%, #15aabf 100%)',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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
        margin: 0,
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
    options: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '8px',
    },
    checkbox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
    },
    checkboxInput: {
        width: '16px',
        height: '16px',
        cursor: 'pointer',
    },
    checkboxLabel: {
        fontSize: '14px',
        color: '#495057',
    },
    forgotLink: {
        fontSize: '14px',
        color: '#228be6',
        textDecoration: 'none',
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
        marginTop: '32px',
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
        .checkbox-input:checked {
            background-color: #228be6;
        }
    `;
    document.head.appendChild(style);
};

if (typeof document !== 'undefined') {
    addGlobalStyles();
}

export default Login;
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        age: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validasi sederhana
        if (formData.password.length < 8) {
            setError("Password minimal 8 karakter");
            setLoading(false);
            return;
        }

        try {
            // Karena backend mengharapkan JSON untuk Register
            // Backend endpoint: /register (UserCreate schema)
            // Payload: { name, email, age, password }
            await axios.post('/register', {
                ...formData,
                age: parseInt(formData.age), // Pastikan age jadi integer
            });

            // Jika sukses, alert dan redirect ke login
            alert("Registrasi Berhasil! Silakan cek email Anda untuk verifikasi akun sebelum login.");
            navigate('/');

        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                // Tampilkan pesan error dari backend (misal: Email sudah ada)
                setError(err.response.data.detail || 'Registrasi gagal');
            } else {
                setError('Tidak dapat terhubung ke server');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="glass-card" style={{ maxWidth: '450px', width: '100%' }}>
                <h2 className="text-center mb-4">Create Account 🚀</h2>
                
                {error && <div className="text-danger mb-4">{error}</div>}

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input 
                            type="text" 
                            name="name"
                            className="form-control" 
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Aji Purnomo"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input 
                            type="email" 
                            name="email"
                            className="form-control" 
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Age</label>
                        <input 
                            type="number" 
                            name="age"
                            className="form-control" 
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="e.g. 25"
                            min="1"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input 
                            type="password" 
                            name="password"
                            className="form-control" 
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Min. 8 characters"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Register Now'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-muted">
                        Already have an account? <Link to="/">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;

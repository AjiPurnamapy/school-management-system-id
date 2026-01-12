import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Form Data required by OAuth2PasswordRequestForm
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            // Tembak API via proxy /token
            const response = await axios.post('/token', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data' // axios automatically sets boundary
                }
            });

            const { access_token } = response.data;
            
            // Simpan token
            localStorage.setItem('token', access_token);
            
            // Redirect ke dashboard
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                setError(err.response.data.detail || 'Login gagal');
            } else {
                setError('Tidak dapat terhubung ke server');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card">
            <h2 className="text-center mb-4">Welcome Back! 👋</h2>
            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label className="form-label">Username</label>
                    <input 
                        type="text" 
                        className="form-control" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Password</label>
                    <input 
                        type="password" 
                        className="form-control" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                
                {error && <p className="text-danger text-center">{error}</p>}
            </form>
        </div>
    );
};

export default Login;

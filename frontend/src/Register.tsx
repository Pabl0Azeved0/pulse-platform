import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useNavigate, Link } from 'react-router-dom';

const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $email: String!, $password: String!) {
    register(username: $username, email: $email, password: $password) {
      id
      username
    }
  }
`;

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const navigate = useNavigate();
  const [register, { loading, error }] = useMutation(REGISTER_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ variables: formData });
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center pt-16 px-4">
      <div className="w-full max-w-md bg-pulse-dark p-8 rounded-2xl shadow-2xl border border-white/5">
        <h2 className="text-3xl font-bold mb-2 text-center text-white">Join Pulse</h2>
        <p className="text-gray-400 text-center mb-6">Create your account today.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400">Username</label>
            <input 
              type="text" 
              className="w-full mt-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-pulse-green focus:ring-1 focus:ring-pulse-green outline-none"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-400">Email</label>
            <input 
              type="email" 
              className="w-full mt-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-pulse-green focus:ring-1 focus:ring-pulse-green outline-none"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Password</label>
            <input 
              type="password" 
              className="w-full mt-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-pulse-green focus:ring-1 focus:ring-pulse-green outline-none"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-pulse-green to-emerald-600 text-black font-bold py-3 rounded-lg hover:opacity-90 transition-all mt-4"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded">{error.message}</p>}
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Already have an account? <Link to="/login" className="text-pulse-blue hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

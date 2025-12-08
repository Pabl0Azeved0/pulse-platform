import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      accessToken
    }
  }
`;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await loginMutation({ variables: { username, password } });
      if (response.data?.login?.accessToken) {
        localStorage.setItem('token', response.data.login.accessToken);
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center pt-16">
      <div className="w-full max-w-md bg-pulse-dark p-8 rounded-2xl shadow-2xl border border-white/5">
        
        <h2 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-pulse-blue to-pulse-green">
          Welcome Back
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pulse-blue focus:ring-1 focus:ring-pulse-blue transition-colors"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pulse-green focus:ring-1 focus:ring-pulse-green transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-pulse-blue to-pulse-green text-black font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm text-center">
              {error.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

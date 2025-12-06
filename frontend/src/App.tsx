import { useQuery, gql } from '@apollo/client';

const HELLO_QUERY = gql`
  query SayHello {
    hello
  }
`;

function App() {
  const { loading, error, data } = useQuery(HELLO_QUERY);

  if (loading) return <p>Loading Pulse...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Pulse Platform</h1>
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '20px', 
        borderRadius: '8px', 
        marginTop: '20px' 
      }}>
        <h3>Backend Status:</h3>
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          {data.hello}
        </p>
      </div>
    </div>
  );
}

export default App;
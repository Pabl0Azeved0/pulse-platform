import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// 1. HTTP Link (Standard Queries/Mutations)
const httpLink = new HttpLink({
  uri: 'http://localhost:8000/graphql',
});

// 2. WebSocket Link (Subscriptions)
const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:8000/graphql', // Note the ws:// protocol
}));

// 3. The Splitter (Traffic Director)
// If the operation is a "subscription", use WS. Otherwise, use HTTP.
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
);
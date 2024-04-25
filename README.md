# Prerequisites
Have the following installed:
- Node.js
- npm
- PostgreSQL


# Initial set up

1. Run `npm install`.

2. Create a `.env` file in the project root with the following keys:
OPTIMISM_RPC_URL='https://mainnet.optimism.io'
ARBITRUM_RPC_URL='https://arb1.arbitrum.io/rpc'
ARB_SENDER_SIGNER_PRIVATE_KEY=
ARB_TOKEN_ADDRESS='0x912CE59144191C1204E64559FE8253a0e49E6548'
POSTGRES_CONNECTION_STRING='postgresql://mikececco2000:password@localhost:5432/sideshift'
WEBSOCKET='wss://optimism-mainnet.infura.io/ws/v3/YOURAPIKEY'
ARBRECIPIENTADDRESS=
USDCRECIPIENTADDRESS=

# Setting up Private Keys and API Key Configuration

To ensure proper functionality and security in your application, follow these steps to set up private keys and configure API keys:

## 1. Configure Private Keys

### ARB Sender Signer Private Key
- Set the environment variable `ARB_SENDER_SIGNER_PRIVATE_KEY` with the private key required to send back ARB tokens programmatically.

### USDC Recipient Address
- Define the wallet address to listen to for USDC transactions on Optimism network. Set the environment variable `USDC_RECIPIENT_ADDRESS` with the appropriate address.

### ARB Recipient Address
- Define the wallet address to receive the ARB tokens. Set the environment variable `ARB_RECIPIENT_ADDRESS` with the appropriate address.

## 2. Configure API Key

### WebSocket API Key
- Obtain an API key for WebSocket communication. Use the one provided by INFURA.
Set the obtained API key in `WEBSOCKET` for WebSocket communication.


# Setting up PostgreSQL Database for Ethereum Transactions

To store Ethereum transactions, you'll need to set up a PostgreSQL database and create a table to store the transactions. Follow these steps to get started:

## 1. Create a PostgreSQL Database

- Make sure you have PostgreSQL installed on your system. You can download it from the [official PostgreSQL website](https://www.postgresql.org/download/).

- Once PostgreSQL is installed, open your preferred SQL client (e.g., pgAdmin, psql command-line tool) and execute the following commands:
  ```sql
  CREATE DATABASE sideshift;
  CREATE SCHEMA ethereum AUTHORIZATION your_postgres_username;
  CREATE TABLE ethereum.ethereum_transactions (
    id SERIAL PRIMARY KEY,
    transaction_hash TEXT NOT NULL,
    block_number INT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    confirmed_at TIMESTAMP
  );


- Replace `'postgresql://mikececco2000:password@localhost:5432/sideshift'` with your actual PostgreSQL connection string and set it in `POSTGRES_CONNECTION_STRING`. Make sure to include the correct username, password, host, port, and database name.

# Running the script

1. Compile TypeScript files wwith `tsc`

2. Run `node/index.js` to start the app and listen for a USDC transaction on Optimism network to the wallet with address set in `USDCRECIPIENTADDRESS`.
 - Make a transaction to `USDCRECIPIENTADDRESS` and see the logs
 - You should receive your corresponding ARB tokens in `ARBRECIPIENTADDRESS` with a 1% fee applied.

2. Run `node/admin.js` and choose your action to see data in the database. One-off action, so to see more, stop and rerun the command.

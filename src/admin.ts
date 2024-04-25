import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import readline from 'readline';

// Load environment variables from .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = 3000;
const { Pool } = require('pg');
const fetch = require('node-fetch');

// PostgreSQL pool configuration
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING
});

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Error handling for database errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Define your Transaction interface
interface Transaction {
  id: number;
  transaction_hash: string;
  block_number: number;
  from_address: string;
  to_address: string;
  amount: number;
  confirmed_at: Date;
}

// Retrieve transaction history from the database
async function getTransactionHistory(): Promise<Transaction[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM ethereum.ethereum_transactions');
    return result.rows;
  } finally {
    client.release();
  }
}

// Retrieve transaction history for a specific transaction ID from the database
async function getOneTransactionHistory(id: number): Promise<Transaction[]> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM ethereum.ethereum_transactions WHERE id = $1', [id]);
    return result.rows;
  } finally {
    client.release();
  }
}

// API endpoint to retrieve all transactions
app.get('/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await getTransactionHistory();
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create interface for reading input from stdin and writing to stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask the user to choose an option
function askOption() {
  // Ask the user to choose an option
  console.log('1. Get all transactions');
  console.log('2. Get specific transaction');

  rl.question('Enter the number of the option you want to choose: ', async (option) => {
    // Based on the user's choice, make the corresponding API call
    switch (option) {
      case '1':
        await getAllTransactions();
        rl.close(); // Close the readline interface after the operation is complete
        break;
      case '2':
        rl.question('Enter the ID: ', async (id) => {
          const transaction = await getOneTransactionHistory(Number(id));
          console.log('Transaction:', transaction);
          rl.close();
        });
        break;
      default:
        console.log('Invalid option');
        break;
    }
  });
}

// Function to get all transactions
async function getAllTransactions() {
  try {
    const response = await fetch('http://localhost:3000/transactions');
    const data = await response.json();
    console.log('All transactions:', data);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  askOption(); // Start asking for user input
});

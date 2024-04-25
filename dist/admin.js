"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const readline_1 = __importDefault(require("readline"));
// Load environment variables from .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = (0, express_1.default)();
const port = 3000;
const { Pool } = require('pg');
const fetch = require('node-fetch');
// PostgreSQL pool configuration
const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING
});
// Middleware to parse JSON requests
app.use(body_parser_1.default.json());
// Error handling for database errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Retrieve transaction history from the database
function getTransactionHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool.connect();
        try {
            const result = yield client.query('SELECT * FROM ethereum.ethereum_transactions');
            return result.rows;
        }
        finally {
            client.release();
        }
    });
}
// Retrieve transaction history for a specific transaction ID from the database
function getOneTransactionHistory(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool.connect();
        try {
            const result = yield client.query('SELECT * FROM ethereum.ethereum_transactions WHERE id = $1', [id]);
            return result.rows;
        }
        finally {
            client.release();
        }
    });
}
// API endpoint to retrieve all transactions
app.get('/transactions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield getTransactionHistory();
        res.json(transactions);
    }
    catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Create interface for reading input from stdin and writing to stdout
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
// Ask the user to choose an option
function askOption() {
    // Ask the user to choose an option
    console.log('1. Get all transactions');
    console.log('2. Get specific transaction');
    rl.question('Enter the number of the option you want to choose: ', (option) => __awaiter(this, void 0, void 0, function* () {
        // Based on the user's choice, make the corresponding API call
        switch (option) {
            case '1':
                yield getAllTransactions();
                rl.close(); // Close the readline interface after the operation is complete
                break;
            case '2':
                rl.question('Enter the ID: ', (id) => __awaiter(this, void 0, void 0, function* () {
                    const transaction = yield getOneTransactionHistory(Number(id));
                    console.log('Transaction:', transaction);
                    rl.close();
                }));
                break;
            default:
                console.log('Invalid option');
                break;
        }
    }));
}
// Function to get all transactions
function getAllTransactions() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch('http://localhost:3000/transactions');
            const data = yield response.json();
            console.log('All transactions:', data);
        }
        catch (error) {
            console.error('Error fetching all transactions:', error);
        }
    });
}
// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    askOption(); // Start asking for user input
});
//# sourceMappingURL=admin.js.map
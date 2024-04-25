import { ethers, isAddress } from 'ethers';

// Load environment variables from .env file
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');
const fs = require('fs');
const BigNumber = require('bignumber.js');
const fetch = require('node-fetch');

// Load ABI from JSON file
const abiJson = fs.readFileSync('./abi.json', 'utf8'); // Adjust the './abi.json' as necessary
const abi = JSON.parse(abiJson);

// Define constants for Ethereum network
const chainName = 'OP Mainnet';
const chainId = 10;
const network = { name: chainName, chainId: chainId };

// Initialize Ethereum provider and wallet
const provider = new ethers.JsonRpcProvider('https://mainnet.optimism.io', network, {
  staticNetwork: true,
});

const arbRecipientAddress = process.env.ARBRECIPIENTADDRESS as string;
const usdcRecipientAddress = process.env.USDCRECIPIENTADDRESS as string; // Recipient address


// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING
});

// // Expected response data from coingecko live price request
// interface PriceApiResponse {
//   'usd-coin': {
//       usd: number;
//   };
//   arbitrum?: {
//       usd: number;
//   };
// }

// Define function to fetch cryptocurrency prices
async function fetchCryptoPrices() {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,arbitrum&vs_currencies=usd';
  const response = await fetch(url);

  if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();

  if (!('usd-coin' in data && typeof data['usd-coin'].usd === 'number')) {
    throw new Error("Received data does not match the PriceApiResponse interface");
  }

  return data;

  // if (isPriceApiResponse(data)) {
  //     return data;
  // } else {
  //     throw new Error("Received data does not match the PriceApiResponse interface");
  // }
}

// Type guard function
// function isPriceApiResponse(object: any): object is PriceApiResponse {
//   return 'usd-coin' in object && typeof object['usd-coin'].usd === 'number';
// }

// Define function to convert USDC to Arbitrum

async function convertUsdcToArbitrum(usdcAmount: number): Promise<number> {
  try {
      // Fetch the current prices
      const prices = await fetchCryptoPrices();

      // Extract the USD prices of USDC and Arbitrum
      const usdcPriceInUsd = prices['usd-coin'].usd;  // USDC price per unit in USD
      const arbitrumPriceInUsd = prices.arbitrum ? prices.arbitrum.usd : 0;  // Arbitrum price per unit in USD

      if (arbitrumPriceInUsd === 0) {
          throw new Error("Arbitrum price data is unavailable.");
      }

      // Calculate how many Arbitrum tokens equivalent to the usdcAmount
      const arbitrumEquivalent = (usdcAmount * usdcPriceInUsd) / arbitrumPriceInUsd;

      console.log(`${usdcAmount} USDC is approximately equal to ${arbitrumEquivalent} Arbitrum tokens.`);
      return arbitrumEquivalent;
  } catch (error) {
      console.error('Failed to convert USDC to Arbitrum:', error);
      throw error; // Re-throw the error if you need further error handling up the chain
  }
}

// Define function to handle transactions
async function handleTransaction(recipientAddress: string, usdcValue: string): Promise<void> {
  console.log(`Sending to ${recipientAddress}`);

  try {
      // Assuming convertUsdcToArbitrum returns a number and needs to be converted to BigNumber
      const arbitrumEquivalent = await convertUsdcToArbitrum(parseFloat(usdcValue));

      // Calculate the fee (1% of the arbitrumEquivalent value)
      const feeAmount = new BigNumber(arbitrumEquivalent).times(0.01);

      // Limit the decimals to 18 (adjust as needed)
      const feeAmountLimited = feeAmount.toFixed(18);

      // Deduct the fee from the arbitrumEquivalent value
      const finalAmount = new BigNumber(arbitrumEquivalent).minus(feeAmountLimited);

      // Limit the decimals to 18 (adjust as needed)
      const finalAmountLimited = finalAmount.toFixed(18);

      // Log the details
      console.log(`Arbitrum equivalent: ${arbitrumEquivalent}`);
      console.log(`Fee amount: ${feeAmount}`);
      console.log(`Amount after fee: ${finalAmount}`);

      // Convert the numeric equivalent to a BigNumber, assuming 18 decimals for the token
      const amountToSend = ethers.parseUnits(finalAmountLimited.toString(), 18);

      // Send tokens
      console.log(`Sending ${amountToSend} ARB`);

      await sendTokens(recipientAddress, amountToSend);

      console.log('Tokens sent successfully!');



  } catch (error) {
      console.error('Failed to convert or send tokens:', error);
  }
}

// Define function to send tokens
async function sendTokens(toAddress: string, amount: BigInt): Promise<void> {
  const chainNameArb = 'Arbitrum One'; // or whatever the name of the network is
  const chainIdArb = 42161; // or whatever the chain ID of the network is

  // Create the network object
  const network = { name: chainNameArb, chainId: chainIdArb };
  const providerArbitrum = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL as string, network, {
  staticNetwork: true,
});
  const walletArbNetwork = new ethers.Wallet(process.env.ARB_SENDER_SIGNER_PRIVATE_KEY as string, providerArbitrum);

  console.log(`From ${walletArbNetwork.address}`);

  //BE SURE TO HAVE ARB AND ETH on ARB IN YOUR ACCOUNT!
  try {
      const tokenContract = new ethers.Contract(process.env.ARB_TOKEN_ADDRESS as string, abi, walletArbNetwork);
      const tx = await tokenContract.transfer(toAddress, amount);
      console.log('Transaction hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);

      storeTransaction(tx.hash, receipt.blockNumber, toAddress, walletArbNetwork.address, amount)

    } catch (error) {
      console.error('Error sending ARB tokens:', error);
      throw error;
    }
}

// Define function to store transaction details in PostgreSQL
async function storeTransaction(txHash: string, blockNumber: number, toAddress: string, from_address: string, amount: BigInt): Promise<void> {
  const query = `
  INSERT INTO ethereum.ethereum_transactions (transaction_hash, block_number, to_address, from_address, amount)
  VALUES ($1, $2, $3, $4, $5);
  `;
  const values = [txHash, blockNumber, toAddress, from_address, amount];
  try {
    const res = await pool.query(query, values);
    if (res.rowCount > 0) {
      console.log('Transaction saved to PostgreSQL');
    } else {
      console.log('Failed to save transaction to PostgreSQL');
    }
  } catch (error) {
    console.error('Error storing transaction in PostgreSQL:', error);
  }
}

// Main function to listen for transfer events
async function getTransfer() {
  const usdcAddress = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"; // Optimism Token USD Coin (Bridged from Ethereum)
  const provider = new ethers.WebSocketProvider(
    process.env.WEBSOCKET as string
  );

  const contract = new ethers.Contract(usdcAddress, abi, provider);

  contract.on('Transfer', async (from, to, amount, data) => {
    let transferEvent = {
      from: from,
      to: to,
      value: amount.toString(), // Convert BigNumber to string for better readability - .toString()
      eventData: data.toString()
  };
  // let  myBigInt = new BigNumber(transferEvent.value, 6);  // `10n` also works

  if (to.toLowerCase() === usdcRecipientAddress.toLowerCase()) {
      let convertedNumber =  ethers.formatUnits(amount, 6)
      const transaction = await handleTransaction(arbRecipientAddress, convertedNumber)

      }
  });
}

getTransfer();

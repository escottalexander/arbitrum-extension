export const skipQuickStart = true;

export const extraContents = `# Arbitrum Extension

## Setup

This extension is meant to be used on testnets/mainnet networks. It will not be able to demonstrate Arbitrum's precompiles if you are running it on devnet (hardhat node). It defaults to using Sepolia and Arbitrum Sepolia as an L1<>L2 pair.

## Using the Arbitrum Bridge
Now you can launch the extension by running:
\`\`\`bash
    yarn start
\`\`\`
Open your browser and navigate to http://localhost:3000.
Go to the 'Bridge' tab and follow the instructions to bridge some ETH from Sepolia to Arbitrum Sepolia.

## Using the Arbitrum Address Table
Once you have some Arbitrum ETH, you can fund your deployer wallet and deploy the ArbAddressTableExample contract
with 'yarn deploy'. Then you can play with the address table precompile by navigating to the 'Address
Table' tab above. Go check out the contract so you can see how it works by Arbitrum providing a special
"precompile" that allows you to cheaply use indexes that reference addresses instead of the actual address - saving you on gas consumed.

## Using Forced Transactions
Go to the 'Forced Tx' tab above. Follow the steps to submit transactions to the Arbitrum Delayed Inbox on L1 - effectively enabling you to post transactions to Arbitrum even if their sequencer would want to censor you. This is one of the key components that makes a layer 2 more than just a sidechain.
Typically, the Arbitrum sequencer will not try to censor you and your transaction will post on the L2 within a few minutes of being submitted. If the sequencer does try to censor you, then after 24 hours, you can force the transaction to be included in the L2.
`;

const { generateKeyPairSync, createSign, createVerify } = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration Parameters
const CONFIG = {
  clientPassphrase: 'clientPass',
  serverPassphrase: 'serverPass',
  keyDirectory: './keys',
};

// Ensure the key directory exists
if (!fs.existsSync(CONFIG.keyDirectory)) {
  fs.mkdirSync(CONFIG.keyDirectory);
}

// Helper Functions to Save and Load Keys
function saveKey(filePath, key) {
  fs.writeFileSync(filePath, key, 'utf8');
}

function loadKey(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Generate and Save Key Pair
function generateAndSaveKeyPair(type, passphrase) {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-192-cbc', passphrase }
  });
  saveKey(path.join(CONFIG.keyDirectory, `${type}_public.pem`), keyPair.publicKey);
  saveKey(path.join(CONFIG.keyDirectory, `${type}_private.pem`), keyPair.privateKey);
}

// Load or Generate Client and Server Key Pairs
if (!fs.existsSync(path.join(CONFIG.keyDirectory, 'client_public.pem'))) {
  generateAndSaveKeyPair('client', CONFIG.clientPassphrase);
}
if (!fs.existsSync(path.join(CONFIG.keyDirectory, 'server_public.pem'))) {
  generateAndSaveKeyPair('server', CONFIG.serverPassphrase);
}

const clientPublicKey = loadKey(path.join(CONFIG.keyDirectory, 'client_public.pem'));
const clientPrivateKey = loadKey(path.join(CONFIG.keyDirectory, 'client_private.pem'));
const serverPublicKey = loadKey(path.join(CONFIG.keyDirectory, 'server_public.pem'));
const serverPrivateKey = loadKey(path.join(CONFIG.keyDirectory, 'server_private.pem'));

// Step 1: Client Sends SYN
function clientSendSyn() {
  try {
    const synMessage = 'SYN';
    const clientSign = createSign('sha256');
    clientSign.update(synMessage);
    const clientSynSignature = clientSign.sign({ key: clientPrivateKey, passphrase: CONFIG.clientPassphrase }, 'base64');

    return { synMessage, clientSynSignature, clientPublicKey };
  } catch (error) {
    console.error('Error in clientSendSyn:', error);
    throw error;
  }
}

// Step 2: Server Receives SYN and Sends SYN-ACK
function serverReceiveSyn(clientSynData) {
  try {
    const clientVerify = createVerify('sha256');
    clientVerify.update(clientSynData.synMessage);
    const clientSynValid = clientVerify.verify(clientSynData.clientPublicKey, clientSynData.clientSynSignature, 'base64');

    if (!clientSynValid) {
      throw new Error('Invalid SYN message from client.');
    }

    const synAckMessage = 'SYN-ACK';
    const serverSign = createSign('sha256');
    serverSign.update(synAckMessage);
    const serverSynAckSignature = serverSign.sign({ key: serverPrivateKey, passphrase: CONFIG.serverPassphrase }, 'base64');

    return { synAckMessage, serverSynAckSignature, serverPublicKey };
  } catch (error) {
    console.error('Error in serverReceiveSyn:', error);
    throw error;
  }
}

// Step 3: Client Receives SYN-ACK and Sends ACK
function clientReceiveSynAck(serverSynAckData) {
  try {
    const serverVerify = createVerify('sha256');
    serverVerify.update(serverSynAckData.synAckMessage);
    const serverSynAckValid = serverVerify.verify(serverSynAckData.serverPublicKey, serverSynAckData.serverSynAckSignature, 'base64');

    if (!serverSynAckValid) {
      throw new Error('Invalid SYN-ACK message from server.');
    }

    const ackMessage = 'ACK';
    const clientSign = createSign('sha256');
    clientSign.update(ackMessage);
    const clientAckSignature = clientSign.sign({ key: clientPrivateKey, passphrase: CONFIG.clientPassphrase }, 'base64');

    return { ackMessage, clientAckSignature };
  } catch (error) {
    console.error('Error in clientReceiveSynAck:', error);
    throw error;
  }
}

// Step 4: Server Verifies ACK
function serverReceiveAck(clientAckData) {
  try {
    const clientVerify = createVerify('sha256');
    clientVerify.update(clientAckData.ackMessage);
    const clientAckValid = clientVerify.verify(serverPublicKey, clientAckData.clientAckSignature, 'base64');

    if (!clientAckValid) {
      throw new Error('Invalid ACK message from client.');
    }

    console.log('Connection established.');
  } catch (error) {
    console.error('Error in serverReceiveAck:', error);
    throw error;
  }
}

// Simulation of the process
try {
  const clientSynData = clientSendSyn();
  const serverSynAckData = serverReceiveSyn(clientSynData);
  const clientAckData = clientReceiveSynAck(serverSynAckData);
  serverReceiveAck(clientAckData);
} catch (error) {
  console.error('Error during 3-way handshake:', error);
}
/**************************************
 * 	1.	Creating a Web Key and Certificate: The function createWebKeyAndCert generates a key and certificate, verified and run externally.
	2.	Creating a Public/Private Key Pair: The createKeyPair function generates RSA key pairs asynchronously, wrapped in a promise.
	3.	Signing Messages: The sign function creates a signer object for SHA-256 and signs messages with the given private key and passphrase.
	4.	Verifying Messages: The verify function creates a verifier object for SHA-256 and verifies message signatures using the provided public key.
 */ 

const { mkdir, rm, readFile, writeFile } = require('node:fs/promises');
const { generateKeyPair, createSign, createVerify } = require('crypto');
const path = require('path');

// Configuration Parameters
const CONFIG = {
  clientPassphrase: 'clientPass',
  serverPassphrase: 'serverPass',
  keyDirectory: './keys',
  tempCertDirectory: './tmp-cert'
};

// Ensure the key directory exists
async function ensureDirectory(directory) {
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${directory}:`, error);
    throw error;
  }
}

// Helper Functions to Save and Load Keys
async function saveKey(filePath, key) {
  try {
    await writeFile(filePath, key, 'utf8');
  } catch (error) {
    console.error(`Error saving key to ${filePath}:`, error);
    throw error;
  }
}

// Load a key from a file
async function loadKey(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Error loading key from ${filePath}:`, error);
    throw error;
  }
}

// Create Web Key and Certificate
async function createWebKeyAndCert() {
  await ensureDirectory(CONFIG.tempCertDirectory);
  // Assume OpenSSL commands or other methods to create a key and certificate are verified externally
  const key = await loadKey(`${CONFIG.tempCertDirectory}/ssl.key`);
  const cert = await loadKey(`${CONFIG.tempCertDirectory}/ssl.crt`);
  await rm(CONFIG.tempCertDirectory, { recursive: true });

  return {
    key,
    cert,
    date: Date.now()
  };
}

// Create Public/Private Key Pair
function createKeyPair(passphrase = '') {
  return new Promise((resolve, reject) => {
    generateKeyPair('rsa', {
      modulusLength: 2048,
      publicExponent: 0x10101,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-192-cbc', passphrase }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ public: publicKey, private: privateKey });
      }
    });
  });
}

// Signing Messages
function sign(message, key, passphrase = '') {
  try {
    const signer = createSign('sha256');
    signer.update(message);
    signer.end();
    return signer.sign({ key, passphrase }, 'base64');
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}

// Verifying Messages
function verify(message, signature, publicKey) {
  try {
    const verifier = createVerify('sha256');
    verifier.update(message);
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
  } catch (error) {
    console.error('Error verifying message:', error);
    throw error;
  }
}

// Load or Generate Client and Server Key Pairs
async function generateAndSaveKeyPair(type, passphrase) {
  const { public: publicKey, private: privateKey } = await createKeyPair(passphrase);
  await saveKey(path.join(CONFIG.keyDirectory, `${type}_public.pem`), publicKey);
  await saveKey(path.join(CONFIG.keyDirectory, `${type}_private.pem`), privateKey);
}

async function loadOrGenerateKeys() {
  await ensureDirectory(CONFIG.keyDirectory);

  if (!await fileExists(path.join(CONFIG.keyDirectory, 'client_public.pem'))) {
    await generateAndSaveKeyPair('client', CONFIG.clientPassphrase);
  }
  if (!await fileExists(path.join(CONFIG.keyDirectory, 'server_public.pem'))) {
    await generateAndSaveKeyPair('server', CONFIG.serverPassphrase);
  }

  const clientPublicKey = await loadKey(path.join(CONFIG.keyDirectory, 'client_public.pem'));
  const clientPrivateKey = await loadKey(path.join(CONFIG.keyDirectory, 'client_private.pem'));
  const serverPublicKey = await loadKey(path.join(CONFIG.keyDirectory, 'server_public.pem'));
  const serverPrivateKey = await loadKey(path.join(CONFIG.keyDirectory, 'server_private.pem'));

  return { clientPublicKey, clientPrivateKey, serverPublicKey, serverPrivateKey };
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

// Step 1: Client Sends SYN
async function clientSendSyn(clientPrivateKey) {
  const synMessage = 'SYN';
  const clientSynSignature = sign(synMessage, clientPrivateKey, CONFIG.clientPassphrase);

  return { synMessage, clientSynSignature };
}

// Step 2: Server Receives SYN and Sends SYN-ACK
async function serverReceiveSyn(clientSynData, serverPrivateKey, clientPublicKey) {
  const clientSynValid = verify(clientSynData.synMessage, clientSynData.clientSynSignature, clientPublicKey);

  if (!clientSynValid) {
    throw new Error('Invalid SYN message from client.');
  }

  const synAckMessage = 'SYN-ACK';
  const serverSynAckSignature = sign(synAckMessage, serverPrivateKey, CONFIG.serverPassphrase);

  return { synAckMessage, serverSynAckSignature };
}

// Step 3: Client Receives SYN-ACK and Sends ACK
async function clientReceiveSynAck(serverSynAckData, clientPrivateKey, serverPublicKey) {
  const serverSynAckValid = verify(serverSynAckData.synAckMessage, serverSynAckData.serverSynAckSignature, serverPublicKey);

  if (!serverSynAckValid) {
    throw new Error('Invalid SYN-ACK message from server.');
  }

  const ackMessage = 'ACK';
  const clientAckSignature = sign(ackMessage, clientPrivateKey, CONFIG.clientPassphrase);

  return { ackMessage, clientAckSignature };
}

// Step 4: Server Verifies ACK
async function serverReceiveAck(clientAckData, serverPublicKey) {
  const clientAckValid = verify(clientAckData.ackMessage, clientAckData.clientAckSignature, serverPublicKey);

  if (!clientAckValid) {
    throw new Error('Invalid ACK message from client.');
  }

  console.log('Connection established.');
}

// Simulation of the process
(async () => {
  try {
    const { clientPublicKey, clientPrivateKey, serverPublicKey, serverPrivateKey } = await loadOrGenerateKeys();

    const clientSynData = await clientSendSyn(clientPrivateKey);
    clientSynData.clientPublicKey = clientPublicKey; // Include client's public key

    const serverSynAckData = await serverReceiveSyn(clientSynData, serverPrivateKey, clientPublicKey);
    serverSynAckData.serverPublicKey = serverPublicKey; // Include server's public key

    const clientAckData = await clientReceiveSynAck(serverSynAckData, clientPrivateKey, serverPublicKey);
    await serverReceiveAck(clientAckData, serverPublicKey);
  } catch (error) {
    console.error('Error during 3-way handshake:', error);
  }
})();
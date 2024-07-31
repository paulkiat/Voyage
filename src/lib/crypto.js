const { mkdir, rm, readFile } = require('node:fs/promises');
const { execSync } = require('child_process');
const { generateKeyPair, createSign, createVerify } = require('crypto');

// Generate private key and self-signed X509 cert for HTTPS server
exports.createWebKeyAndCert = async function () {
    const certDir = 'tmp-cert';
    try {
        await mkdir(certDir);
        // MODIFY THIS LINE: Adjust the details for your finalized application name and certificate information
        // Location: /C=US/ST=YourState/L=YourCity
        // > Replace YourState with the appropriate state.
        // > Replace YourCity with the appropriate city.
        // Organization: /O=RawhAI
        // > Replace RawhAI with your finalized application name.
        // Common Name (CN): /CN=rawh.ai
        // > Replace rawh.ai with your finalized domain or common name.
        execSync(`openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout ${certDir}/ssl.key -out ${certDir}/ssl.crt -subj "/C=US/ST=YourState/L=YourCity/O=RawhAI/OU=HQ/CN=rawh.ai" 2>&1`);
        const key = await readFile(`${certDir}/ssl.key`);
        const cert = await readFile(`${certDir}/ssl.crt`);
        return {
            key: key.toString(),
            cert: cert.toString(),
            date: Date.now()
        };
    } finally {
        await rm(certDir, { recursive: true });
    }
}

// The generateSharedSecret function is used to generate a shared secret key for a 3-way handshake.
// This function takes in two parameters: publicKey and privateKey.
// It returns a promise that resolves to the shared secret key, encoded in base64.
exports.generateSharedSecret = async function(publicKey, privateKey) {
    return new Promise((resolve, reject) => {
        // We first create an ephemeral Diffie-Hellman key pair using the crypto.DiffieHellman class.
        // The 'auto' parameter tells the class to automatically choose the group size.
        // The publicKey and privateKey parameters are used to initialize the key pair.
        // The key pair is created using the 'auto', publicKey, and privateKey parameters.
        const secretKey = crypto.DiffieHellman.createEphemeralKey('auto', publicKey, privateKey);

        // We then compute the shared secret key using the computeSecret method of the Diffie-Hellman key pair.
        // The computeSecret method takes in the public key of the other party and computes the shared secret key.
        // The shared secret key is computed using the other party's public key and our private key.
        const sharedSecret = secretKey.computeSecret(publicKey);

        // Finally, we resolve the promise with the shared secret key, encoded in base64.
        // The shared secret key is returned as a string, encoded in base64, so that it can be easily transmitted over a network.
        resolve(sharedSecret.toString('base64'));
    });
};

// Create a public/private key pair for signing/verifying messages
exports.createKeyPair = function (passphrase = '') {
    return new Promise((resolve, reject) => {
        generateKeyPair('rsa', {
            modulusLength: 2048,
            publicExponent: 0x10101,
            publicKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-192-cbc',
                passphrase
            }
        }, (err, publicKey, privateKey) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    public: publicKey,
                    private: privateKey
                });
            }
        });
    });
};


/*
 * The clientSendSyn function is used in the 3-way handshake process to generate a
 * SYN message and its corresponding signature. The function takes a private key
 * as an argument and creates a message variable with the value 'syn'. The function
 * then calls the sign function (which is defined in this module) to generate a
 * signature of the message using the provided private key. The resulting message
 * and signature are then wrapped in an object and returned from the function.
 */
exports.clientSendSyn = async function(privateKey) {
    // Create a message variable with the value 'syn'
    const message = 'syn';

    // Call the sign function to generate a signature of the message using the provided private key
    const signature = this.sign(message, privateKey);

    // Wrap the message and signature in an object and return it
    return { message, signature };
};


/**
 * The serverReceiveSyn function is responsible for handling the SYN message sent
 * by the client during the 3-way handshake process. It verifies the client's
 * handshake data, generates a SYN-ACK message along with its signature if the
 * client's data is valid, and returns the result as an object.
 */
exports.serverReceiveSyn = async function(clientSynData, privateKey, publicKey) {
    // Extract the SYN message and its signature from the clientSynData object
    const { message: clientSynMessage, signature: clientSynSignature } = clientSynData;

    // Verify the signature of the SYN message using the public key
    const isClientSynValid = this.verify(clientSynMessage, clientSynSignature, publicKey);

    // If the client's handshake data is valid
    if (isClientSynValid) {
        // Generate a SYN-ACK message
        const synAckMessage = 'syn_ack';

        // Generate a signature of the SYN-ACK message using the provided private key
        const synAckSignature = this.sign(synAckMessage, privateKey);

        // Wrap the SYN-ACK message and its signature in an object and return it
        return { message: synAckMessage, signature: synAckSignature };
    } else {
        // If the client's handshake data is invalid, throw an error
        throw new Error('Client handshake data is invalid');
    }
};

/**
 * The clientReceiveSynAck function is responsible for handling the SYN-ACK message
 * sent by the server during the 3-way handshake process. It verifies the server's
 * handshake data, generates an ACK message along with its signature if the server's
 * data is valid, and returns the result as an object.
 */
exports.clientReceiveSynAck = async function(serverSynAckData, privateKey, publicKey) {
    // Extract the SYN-ACK message and its signature from the serverSynAckData object
    const { message, signature } = serverSynAckData;

    // Verify the signature of the SYN-ACK message using the public key
    if (this.verify(message, signature, publicKey)) {
        // If the server's handshake data is valid, generate an ACK message
        const ackMessage = 'ack';

        // Generate a signature of the ACK message using the provided private key
        const ackSignature = this.sign(ackMessage, privateKey);

        // Wrap the ACK message and its signature in an object and return it
        return { message: ackMessage, signature: ackSignature };
    } else {
        // If the server's handshake data is invalid, throw an error
        throw new Error('Server handshake data is invalid');
    }
};

/**
 * The serverReceiveAck function is responsible for handling the ACK message sent by
 * the client during the 3-way handshake process. It verifies the client's handshake
 * data and returns 'Handshake successful' if the signature is valid. If the signature
 * is invalid, it throws an error indicating that the client's handshake data is invalid.
 */
exports.serverReceiveAck = async function(clientAckData, publicKey) {
    // Extract the ACK message and its signature from the clientAckData object
    const { message, signature } = clientAckData;

    // Verify the signature of the ACK message using the public key
    if (this.verify(message, signature, publicKey)) {
        // If the signature is valid, return 'Handshake successful'
        return 'Handshake successful';
    } else {
        // If the signature is invalid, throw an error indicating that the client handshake data is invalid
        throw new Error('Client handshake data is invalid');
    }
};
// Sign a message with a private key
exports.sign = function(message, key, passphrase = '') {
    const signer = createSign('sha256');
    signer.update(message);
    signer.end();
    return signer.sign({ key, passphrase }, 'base64');
};

// Verify a message signature with a public key
exports.verify = function(message, signature, publicKey) {
    const verifier = createVerify('sha256');
    verifier.update(message);
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
};
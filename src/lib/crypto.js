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